import { TransferQueue, QueuedTransfer } from "./TransferQueue"
import { ChunkEngine } from "./ChunkEngine"
import { ChunkReceiver } from "./ChunkReceiver"
import { FlowController } from "./FlowController"
import { encodeControl, decodeControl, CURRENT_PROTOCOL_VERSION } from "./protocol"
import { TransferEvent, TransferEventHandler, FileMetadata, TransferProgress } from "./types"
import { RateMeter } from "./rateMeter"
import { makeTransferId } from "../utils"

import { SendPipeline } from "./SendPipeline"

/**
 * Production-grade WebRTC file transfer engine.
 *
 * Sender pipeline:
 *   read[N+1..N+4] ──► encode-in-place ──► SendPipeline queue ──► channel.send()
 *
 * Receiver pipeline:
 *   onmessage ──► decode (zero-copy) ──► writeChain.push (fire-and-forget)
 *
 * Key properties:
 * - DataChannel is NEVER left idle while there is buffered capacity.
 * - File reads are pipelined (4-deep) — disk I/O overlaps network I/O.
 * - No BUFFER_PAUSE/RESUME round-trips — flow control lives entirely in the
 *   DataChannel watermarks, removing one network RTT from the critical path.
 * - Zero new ArrayBuffer allocations in the send hot-path (reused per-engine).
 * - Zero payload copies on the receive hot-path (Uint8Array views).
 * - Progress events batched at 50 ms.
 */
export class TransferEngine {
  private queue = new TransferQueue()
  private activeSendId: string | null = null
  private handlers = new Set<TransferEventHandler>()
  private abortControllers = new Map<string, AbortController>()
  private receivers = new Map<string, ChunkReceiver>()
  private currentReceivingId: string | null = null
  private acceptedIds = new Set<string>()

  // Binary message processing: run synchronously without yielding between chunks
  private messageQueue: ArrayBuffer[] = []   // binary only
  private controlQueue: string[] = []        // control text only
  private isProcessingBinary = false

  constructor(private readonly channel: RTCDataChannel) {
    channel.binaryType = "arraybuffer"
    channel.onmessage = (ev) => this.onMessage(ev.data)
    channel.onclose   = () => this.failAll("DataChannel closed")
  }

  onEvent(handler: TransferEventHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  private emit(event: TransferEvent) {
    for (const h of this.handlers) h(event)
  }

  // ── Queueing & Sending ────────────────────────────────────────────────────

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
    // Wait for TRANSFER_ACCEPT before starting — do NOT call startNext() here
  }

  private async startNext() {
    if (this.activeSendId) return

    const next = this.queue.items.find(
      t => t.direction === "send"
        && this.acceptedIds.has(t.metadata.transferId)
        && !this.abortControllers.has(t.metadata.transferId)
    )
    if (!next) return

    this.queue.remove(next.metadata.transferId)
    this.activeSendId = next.metadata.transferId
    await this.processSend(next)
    this.activeSendId = null
    void this.startNext()
  }

  private async processSend(transfer: QueuedTransfer) {
    const meta   = transfer.metadata
    const file   = transfer.file!
    const engine = new ChunkEngine(file, meta.transferId)
    const ac     = new AbortController()
    this.abortControllers.set(meta.transferId, ac)

    // Setup the decoupled send pipeline
    const pipeline = new SendPipeline(
      this.channel,
      meta,
      engine.chunkSize,
      (progress) => this.emit({ type: "LocalProgress", progress })
    )

    try {
      this.emit({ type: "TransferStarted", metadata: meta })
      this.sendControl({ t: "TRANSFER_METADATA", metadata: meta })

      // Start the producer coroutine (reads disk -> encodes -> pushes to pipeline)
      const pumpPromise = engine.pump(pipeline, ac.signal)

      // Wait until every chunk has been flushed to channel.send()
      await pipeline.waitUntilDone()

      // Ensure pump hasn't thrown (e.g. read error)
      await pumpPromise

      if (ac.signal.aborted) {
        this.sendControl({ t: "TRANSFER_CANCEL", id: meta.transferId })
        return
      }

      this.sendControl({ t: "TRANSFER_COMPLETE", id: meta.transferId })
      this.emit({ type: "TransferCompleted", transferId: meta.transferId })

    } catch (err) {
      if (!ac.signal.aborted) {
        this.emit({
          type: "TransferFailed",
          transferId: meta.transferId,
          error: err instanceof Error ? err.message : "Send failed"
        })
      }
    } finally {
      this.abortControllers.delete(meta.transferId)
      transfer.file = undefined as any
    }
  }

  // ── Receiving ─────────────────────────────────────────────────────────────

  async acceptIncoming(ids: string[]) {
    for (const id of ids) {
      const queued = this.queue.items.find(t => t.metadata.transferId === id)
      if (!queued) continue

      const ac = new AbortController()
      this.abortControllers.set(id, ac)

      const receiver = new ChunkReceiver(
        queued.metadata,
        ac.signal,
        (progress) => this.emit({ type: "LocalProgress", progress }),
        async (downloadUrl, blob) => {
          this.emit({ type: "TransferCompleted", transferId: id })
          if (downloadUrl) this.emit({ type: "DownloadCompleted", transferId: id, downloadUrl })
          this.cleanupReceiver(id)
        },
        (error) => {
          this.emit({ type: "TransferFailed", transferId: id, error })
          this.cleanupReceiver(id)
        },
        (evt) => {
          if (evt === "VerificationStarted")  this.emit({ type: "VerificationStarted",  transferId: id })
          if (evt === "VerificationFinished") this.emit({ type: "VerificationFinished", transferId: id, isValid: true })
          if (evt === "DownloadStarted")      this.emit({ type: "DownloadStarted",      transferId: id })
        }
      )
      await receiver.initialize()
      this.receivers.set(id, receiver)
    }
    this.sendControl({ t: "TRANSFER_ACCEPT", ids })
  }

  rejectIncoming(ids: string[]) {
    this.sendControl({ t: "TRANSFER_REJECT", ids })
    for (const id of ids) this.cancel(id)
  }

  // ── Controls ──────────────────────────────────────────────────────────────

  pause(id: string)  { this.emit({ type: "BufferPause",  transferId: id }) }
  resume(id: string) { this.emit({ type: "BufferResume", transferId: id }) }

  cancel(id: string) {
    this.abortControllers.get(id)?.abort()
    this.queue.remove(id)
    this.sendControl({ t: "TRANSFER_CANCEL", id })
    this.emit({ type: "TransferCancelled", transferId: id })
    this.cleanupReceiver(id)
  }

  private cleanupReceiver(id: string) {
    this.abortControllers.delete(id)
    this.receivers.delete(id)
    if (this.currentReceivingId === id) this.currentReceivingId = null
  }

  private sendControl(msg: Parameters<typeof encodeControl>[0]) {
    if (this.channel.readyState === "open") this.channel.send(encodeControl(msg))
  }

  // ── Message handling ──────────────────────────────────────────────────────

  private onMessage(data: unknown) {
    if (typeof data === "string") {
      // Control message — decode and handle synchronously (cheap JSON parse)
      const msg = decodeControl(data)
      if (msg) this.handleControl(msg)
      return
    }

    if (!(data instanceof ArrayBuffer)) return  // safety guard

    // Binary chunk — push to queue, dispatch processor if not already running
    this.messageQueue.push(data)
    if (!this.isProcessingBinary) void this.drainBinaryQueue()
  }

  /**
   * Drain all buffered binary chunks.
   *
   * ChunkReceiver.handleChunk is synchronous (write chain is fire-and-forget),
   * so this loop runs without any internal await — it processes ALL queued
   * chunks in one microtask batch, keeping CPU utilization high.
   */
  private async drainBinaryQueue() {
    this.isProcessingBinary = true
    try {
      while (this.messageQueue.length > 0) {
        const buf = this.messageQueue.shift()!
        if (this.currentReceivingId) {
          const receiver = this.receivers.get(this.currentReceivingId)
          // handleChunk is synchronous — no await, no yield between chunks
          receiver?.handleChunk(buf)
        }
      }
    } finally {
      this.isProcessingBinary = false
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
        for (const id of msg.ids) this.acceptedIds.add(id)
        void this.startNext()
        break

      case "TRANSFER_REJECT":
        for (const id of msg.ids) this.cancel(id)
        break

      case "TRANSFER_CANCEL":
      case "TRANSFER_ABORT": {
        const ac = this.abortControllers.get(msg.id)
        if (ac) ac.abort()
        this.emit({ type: "TransferCancelled", transferId: msg.id })
        this.cleanupReceiver(msg.id)
        break
      }

      // Silently ack — no action needed
      case "TRANSFER_VERIFY":
      case "TRANSFER_SUCCESS":
      case "TRANSFER_FAILED":
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
    this.queue.clear()
    this.receivers.clear()
    this.abortControllers.clear()
    this.acceptedIds.clear()
  }

  destroy() {
    this.failAll("Engine destroyed")
    this.channel.onmessage = null
    this.channel.onclose   = null
  }
}
