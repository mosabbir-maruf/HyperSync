import { TransferQueue, QueuedTransfer } from "./TransferQueue"
import { ChunkEngine } from "./ChunkEngine"
import { ChunkReceiver } from "./ChunkReceiver"
import { FlowController } from "./FlowController"
import { encodeControl, decodeControl, CURRENT_PROTOCOL_VERSION } from "./protocol"
import { TransferEvent, TransferEventHandler, FileMetadata, TransferProgress } from "./types"
import { RateMeter } from "./rateMeter"
import { makeTransferId } from "../utils"
import { integrityService } from "./IntegrityService"

export class TransferEngine {
  private queue = new TransferQueue()
  private activeSendId: string | null = null
  private handlers = new Set<TransferEventHandler>()
  private flow: FlowController
  private abortControllers = new Map<string, AbortController>()
  private receivers = new Map<string, ChunkReceiver>()
  private currentReceivingId: string | null = null
  private messageQueue: unknown[] = []
  private binaryQueueSize = 0           // fast O(1) counter for binary messages
  private isProcessingMessages = false
  private acceptedIds = new Set<string>()
  private receiverPaused = false
  private static readonly PAUSE_AT = 80    // pause sender when queue reaches this many binary chunks
  private static readonly RESUME_AT = 20  // resume sender when queue drains this low
  
  constructor(private readonly channel: RTCDataChannel) {
    this.flow = new FlowController(channel)
    channel.binaryType = "arraybuffer"
    channel.onmessage = (ev) => this.onMessage(ev.data)
    channel.onclose = () => this.failAll("DataChannel closed")
  }

  onEvent(handler: TransferEventHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  private emit(event: TransferEvent) {
    for (const handler of this.handlers) {
      handler(event)
    }
  }

  // ---- Queueing & Sending ----
  sendFiles(files: File[]) {
    const metas: FileMetadata[] = []
    
    for (const file of files) {
      const id = makeTransferId()
      const meta: FileMetadata = {
        transferId: id,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
        lastModified: file.lastModified,
        chunkCount: Math.ceil(file.size / (256 * 1024)),
        checksumMethod: "SHA-256-CHUNK-XOR",
        protocolVersion: CURRENT_PROTOCOL_VERSION
      }
      
      metas.push(meta)
      this.queue.add({ metadata: meta, file, direction: "send" })
      this.emit({ type: "TransferQueued", metadata: meta })
    }

    this.sendControl({ t: "TRANSFER_INIT", files: metas, protocolVersion: CURRENT_PROTOCOL_VERSION })
    // Do NOT call startNext() here — we wait for TRANSFER_ACCEPT from the receiver
  }

  private async startNext() {
    if (this.activeSendId) return
    
    const next = this.queue.items.find(t => t.direction === "send" && this.acceptedIds.has(t.metadata.transferId) && !this.abortControllers.has(t.metadata.transferId))
    if (!next) return

    this.queue.remove(next.metadata.transferId)
    this.activeSendId = next.metadata.transferId
    
    await this.processSend(next)
    
    this.activeSendId = null
    void this.startNext()
  }

  private async processSend(transfer: QueuedTransfer) {
    const meta = transfer.metadata
    const file = transfer.file!
    const engine = new ChunkEngine(file, meta.transferId)
    const meter = new RateMeter(file.size)

    const ac = new AbortController()
    this.abortControllers.set(meta.transferId, ac)

    try {
      this.emit({ type: "TransferStarted", metadata: meta })
      this.sendControl({ t: "TRANSFER_METADATA", metadata: meta })
      meter.start()

      // Yield a full browser frame so the "progress" status renders before chunks fly
      await new Promise<void>(r => requestAnimationFrame(() => r()))

      let bytesSent = 0
      let chunksSent = 0

      for await (const { header, buffer } of engine.generateChunks(ac.signal)) {
        if (ac.signal.aborted) break

        await this.flow.awaitUserResume(ac.signal)
        await this.flow.awaitDrain(ac.signal)

        this.channel.send(buffer)

        bytesSent += header.length
        chunksSent++

        const { speed, eta } = meter.sample(bytesSent)

        const progress: TransferProgress = {
          transferId: meta.transferId,
          bytesSent,
          bytesReceived: 0,
          chunksSent,
          chunksReceived: 0,
          totalBytes: file.size,
          totalChunks: engine.chunkCount,
          percentage: (bytesSent / file.size) * 100,
          speedBytesPerSecond: speed,
          estimatedTimeRemainingSeconds: eta ?? 0
        }

        this.emit({ type: "LocalProgress", progress })
        this.emit({ type: "ChunkSent", transferId: meta.transferId, progress })
      }

      if (ac.signal.aborted) {
        this.sendControl({ t: "TRANSFER_CANCEL", id: meta.transferId })
        return
      }

      // WebRTC DataChannel (ordered=true) is 100% reliable via SCTP — no checksum needed
      this.sendControl({ t: "TRANSFER_COMPLETE", id: meta.transferId })
      this.emit({ type: "TransferCompleted", transferId: meta.transferId })

    } catch (err) {
      console.error("[TransferEngine] Send error:", err)
      if (!ac.signal.aborted) {
        this.emit({ type: "TransferFailed", transferId: meta.transferId, error: err instanceof Error ? err.message : "Send failed" })
      }
    } finally {
      this.abortControllers.delete(meta.transferId)
      transfer.file = undefined as any
    }
  }

  // ---- Receiving ----
  async acceptIncoming(ids: string[]) {
    for (const id of ids) {
      const queued = this.queue.items.find(t => t.metadata.transferId === id)
      if (queued) {
        const ac = new AbortController()
        this.abortControllers.set(id, ac)

        const receiver = new ChunkReceiver(
          queued.metadata,
          ac.signal,
          (progress) => {
            this.emit({ type: "LocalProgress", progress })
            this.emit({ type: "ChunkReceived", transferId: id, progress })
          },
          async (downloadUrl, _blob) => {
            this.emit({ type: "TransferCompleted", transferId: id })
            if (downloadUrl) {
              this.emit({ type: "DownloadCompleted", transferId: id, downloadUrl })
            }
            this.cleanupReceiver(id)
          },
          (error) => {
            this.emit({ type: "TransferFailed", transferId: id, error })
            this.cleanupReceiver(id)
          },
          (evt) => {
             if (evt === "VerificationStarted") this.emit({ type: "VerificationStarted", transferId: id })
             if (evt === "VerificationFinished") this.emit({ type: "VerificationFinished", transferId: id, isValid: true })
             if (evt === "DownloadStarted") this.emit({ type: "DownloadStarted", transferId: id })
          }
        )
        await receiver.initialize()
        this.receivers.set(id, receiver)
      }
    }
    this.sendControl({ t: "TRANSFER_ACCEPT", ids })
  }

  rejectIncoming(ids: string[]) {
    this.sendControl({ t: "TRANSFER_REJECT", ids })
    for (const id of ids) {
      this.cancel(id)
    }
  }

  // ---- Controls ----
  pause(id: string) {
    if (this.activeSendId === id) {
       this.flow.pause()
       this.emit({ type: "BufferPause", transferId: id })
    }
    this.sendControl({ t: "BUFFER_PAUSE", id })
  }

  resume(id: string) {
    if (this.activeSendId === id) {
       this.flow.resume()
       this.emit({ type: "BufferResume", transferId: id })
    }
    this.sendControl({ t: "BUFFER_RESUME", id })
  }

  cancel(id: string) {
    const ac = this.abortControllers.get(id)
    if (ac) ac.abort()
    
    this.queue.remove(id)
    this.sendControl({ t: "TRANSFER_CANCEL", id })
    this.emit({ type: "TransferCancelled", transferId: id })
    
    this.cleanupReceiver(id)
  }

  private cleanupReceiver(id: string) {
    this.abortControllers.delete(id)
    this.receivers.delete(id)
    if (this.currentReceivingId === id) {
      this.currentReceivingId = null
      this.receiverPaused = false
      this.binaryQueueSize = 0
    }
  }

  private sendControl(msg: Parameters<typeof encodeControl>[0]) {
    if (this.channel.readyState === "open") {
      this.channel.send(encodeControl(msg))
    }
  }

  // ---- Handling Incoming ----
  private onMessage(data: unknown) {
    this.messageQueue.push(data)

    if (typeof data !== "string") {
      this.binaryQueueSize++
      // Backpressure: pause sender when binary queue is too large
      if (!this.receiverPaused && this.binaryQueueSize >= TransferEngine.PAUSE_AT && this.currentReceivingId) {
        this.receiverPaused = true
        this.sendControl({ t: "BUFFER_PAUSE", id: this.currentReceivingId })
      }
    }

    if (!this.isProcessingMessages) {
      void this.processMessages()
    }
  }

  private async processMessages() {
    this.isProcessingMessages = true
    try {
      while (this.messageQueue.length > 0) {
        const data = this.messageQueue.shift()
        if (typeof data !== "string") this.binaryQueueSize--
        await this.handleMessageData(data)

        // Backpressure: resume sender only when queue drains to low-water mark
        if (this.receiverPaused && this.binaryQueueSize <= TransferEngine.RESUME_AT && this.currentReceivingId) {
          this.receiverPaused = false
          this.sendControl({ t: "BUFFER_RESUME", id: this.currentReceivingId })
        }
      }
    } finally {
      this.isProcessingMessages = false
    }
  }

  private async handleMessageData(data: unknown) {
    if (typeof data === "string") {
      const msg = decodeControl(data)
      if (msg) this.handleControl(msg)
      return
    }
    
    let buffer: ArrayBuffer
    if (data instanceof ArrayBuffer || (data && (data as any).constructor?.name === "ArrayBuffer")) {
      buffer = data as ArrayBuffer
    } else if (data instanceof Blob || (data && typeof (data as any).arrayBuffer === "function")) {
      buffer = await (data as any).arrayBuffer()
    } else if (data instanceof Uint8Array || (data && (data as any).constructor?.name === "Uint8Array")) {
      const u8 = data as any
      buffer = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength)
    } else {
      console.warn("[TransferEngine] Unknown binary data type received:", data)
      return
    }

    if (this.currentReceivingId) {
      const receiver = this.receivers.get(this.currentReceivingId)
      if (receiver) {
        await receiver.handleChunk(buffer)
      }
    }
  }

  private handleControl(msg: ReturnType<typeof decodeControl>) {
    if (!msg) return
    switch (msg.t) {
      case "TRANSFER_INIT":
        for (const meta of msg.files) {
          this.emit({ type: "MetadataReceived", metadata: meta })
          this.queue.add({ metadata: meta, direction: "receive" })
        }
        break
      case "TRANSFER_METADATA":
        this.currentReceivingId = msg.metadata.transferId
        this.emit({ type: "TransferStarted", metadata: msg.metadata })
        break
      case "TRANSFER_COMPLETE": {
        const id = msg.id
        const receiver = this.receivers.get(id)
        if (receiver) {
          void receiver.complete(msg.checksum).then(() => {
            this.sendControl({ t: "TRANSFER_SUCCESS", id })
          })
        }
        break
      }
      case "TRANSFER_ACCEPT":
      case "TRANSFER_REJECT":
        if (msg.t === "TRANSFER_REJECT") {
          for (const id of msg.ids) this.cancel(id)
        } else {
          for (const id of msg.ids) this.acceptedIds.add(id)
          void this.startNext()
        }
        break
      case "BUFFER_PAUSE":
        if (this.activeSendId === msg.id) {
          this.flow.pause()
          this.emit({ type: "BufferPause", transferId: msg.id })
        }
        break
      case "BUFFER_RESUME":
        if (this.activeSendId === msg.id) {
          this.flow.resume()
          this.emit({ type: "BufferResume", transferId: msg.id })
        }
        break
      case "TRANSFER_CANCEL":
      case "TRANSFER_ABORT":
        const ac = this.abortControllers.get(msg.id)
        if (ac) ac.abort()
        this.emit({ type: "TransferCancelled", transferId: msg.id })
        this.cleanupReceiver(msg.id)
        break
      case "TRANSFER_VERIFY":
        break
      case "TRANSFER_SUCCESS":
        break
      case "TRANSFER_FAILED":
        break
      case "TRANSFER_PROGRESS":
        break
    }
  }

  private failAll(reason: string) {
    for (const t of this.queue.items) {
      this.emit({ type: "TransferFailed", transferId: t.metadata.transferId, error: reason })
    }
    if (this.activeSendId) {
      this.emit({ type: "TransferFailed", transferId: this.activeSendId, error: reason })
    }
    for (const ac of this.abortControllers.values()) ac.abort()
    
    // Cleanup
    this.queue.clear()
    this.receivers.clear()
    this.abortControllers.clear()
    this.acceptedIds.clear()
  }

  destroy() {
    this.failAll("Engine destroyed")
    this.channel.onmessage = null
    this.channel.onclose = null
  }
}
