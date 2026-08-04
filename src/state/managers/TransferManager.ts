import { TransferEngine } from "../../lib/transfer/TransferEngine"
import type {
  FileMetadata,
  TransferItem,
  TransferEvent,
} from "../../lib/transfer/types"
import { toast } from "../../lib/notify/toast"

export interface TransferState {
  items: TransferItem[]
  incoming: FileMetadata[] | null
}

const INITIAL_STATE: TransferState = {
  items: [],
  incoming: null,
}

export class TransferManager {
  private state: TransferState = { ...INITIAL_STATE }
  private listeners = new Set<(s: TransferState) => void>()
  private engine: TransferEngine | null = null
  private itemsMap = new Map<string, TransferItem>()
  private lastStatus = new Map<string, TransferItem["status"]>()

  private emitScheduled = false
  private emitTimeout: number | null = null
  private unsubEngine: (() => void) | null = null
  private pendingSends: { files: File[]; overrideIds?: string[] }[] = []

  // We allow an external observer to listen to raw engine events (like ChannelOpen/Close)
  // so that ConnectionStateManager can consume them.
  private eventListeners = new Set<(e: TransferEvent) => void>()

  public attachEngine(engine: TransferEngine): void {
    if (this.engine) this.detachEngine()
    this.engine = engine

    this.unsubEngine = this.engine.onEvent((event: TransferEvent) => {
      // Forward raw events to SessionManager/ConnectionStateManager
      for (const listener of this.eventListeners) {
        listener(event)
      }
      this.handleTransferEvent(event)
    })

    // Flush any sends that were queued before the engine was attached
    const queued = this.pendingSends
    this.pendingSends = []
    for (const pending of queued) {
      this.engine.sendFiles(pending.files, pending.overrideIds)
    }
  }

  public onEngineEvent(fn: (e: TransferEvent) => void): () => void {
    this.eventListeners.add(fn)
    return () => this.eventListeners.delete(fn)
  }

  public subscribe(fn: (s: TransferState) => void): () => void {
    this.listeners.add(fn)
    fn(this.state)
    return () => this.listeners.delete(fn)
  }

  public getState(): TransferState {
    return this.state
  }

  private set(patch: Partial<TransferState>): void {
    this.state = { ...this.state, ...patch }
    for (const fn of this.listeners) fn(this.state)
  }

  private scheduleEmit(): void {
    if (this.emitScheduled) return
    this.emitScheduled = true
    this.emitTimeout = window.setTimeout(() => {
      this.emitScheduled = false
      this.emitTimeout = null
      this.flushItems()
    }, 16)
  }

  private flushNow(): void {
    if (this.emitTimeout) {
      clearTimeout(this.emitTimeout)
      this.emitTimeout = null
    }
    this.emitScheduled = false
    this.flushItems()
  }

  private flushItems(): void {
    const items = Array.from(this.itemsMap.values())
    this.announceStatusChanges(items)
    this.set({ items })
  }

  private patchItem(
    id: string,
    patch: Partial<TransferItem>,
    immediate = false,
  ): void {
    const cur = this.itemsMap.get(id)
    if (!cur) return

    // Prevent trailing progress events from reverting a terminal state back to 'progress'
    const isTerminal =
      cur.status === "completed" ||
      cur.status === "cancelled" ||
      cur.status === "failed"

    if (isTerminal && patch.status && patch.status !== cur.status) {
      delete patch.status
    }

    this.itemsMap.set(id, { ...cur, ...patch })
    if (immediate) {
      this.flushNow()
    } else {
      this.scheduleEmit()
    }
  }

  private handleTransferEvent(event: TransferEvent) {
    switch (event.type) {
      case "TransferQueued":
      case "MetadataReceived": {
        const meta = event.metadata
        if (!this.itemsMap.has(meta.transferId)) {
          this.itemsMap.set(meta.transferId, {
            id: meta.transferId,
            name: meta.fileName,
            size: meta.fileSize,
            mime: meta.mimeType,
            direction: event.type === "TransferQueued" ? "send" : "receive",
            status: "pending",
            bytesTransferred: 0,
            speed: 0,
            averageSpeed: 0,
            eta: null,
            elapsed: 0,
            remainingBytes: meta.fileSize,
            verification: "pending",
            connectionQuality: "unknown",
            reconnectAttempts: 0,
            startedAt: Date.now(),
            checksumMethod: meta.checksumMethod,
          })

          if (event.type === "MetadataReceived") {
            const currentIncoming = this.state.incoming || []
            this.set({ incoming: [...currentIncoming, meta] })
          }
          this.scheduleEmit()
        }
        break
      }
      case "TransferStarted":
        this.patchItem(event.metadata.transferId, { status: "progress" }, true)
        break
      case "LocalProgress":
      case "ChunkSent":
      case "ChunkReceived": {
        const p = event.progress
        const transferred = p.bytesSent > 0 ? p.bytesSent : p.bytesReceived
        const quality =
          p.speedBytesPerSecond === 0
            ? "unknown"
            : p.speedBytesPerSecond < 128 * 1024
              ? "poor"
              : p.speedBytesPerSecond < 1024 * 1024
                ? "fair"
                : "good"
        const currentItem = this.itemsMap.get(p.transferId)
        this.patchItem(p.transferId, {
          status: currentItem?.status === "paused" ? "paused" : "progress",
          bytesTransferred: transferred,
          speed: p.speedBytesPerSecond,
          eta: p.estimatedTimeRemainingSeconds,
          remainingBytes: p.totalBytes - transferred,
          connectionQuality: quality,
        })
        break
      }
      case "BufferPause":
        this.patchItem(event.transferId, { status: "paused" }, true)
        break
      case "BufferResume":
        this.patchItem(event.transferId, { status: "progress" }, true)
        break
      case "TransferCancelled":
        this.patchItem(
          event.transferId,
          {
            status: "cancelled",
            error: event.remote ? "remote_cancel" : undefined,
          },
          true,
        )
        if (this.state.incoming) {
          const newIncoming = this.state.incoming.filter(m => m.transferId !== event.transferId)
          if (newIncoming.length !== this.state.incoming.length) {
            this.set({ incoming: newIncoming.length > 0 ? newIncoming : null })
          }
        }
        break
      case "VerificationStarted":
        this.patchItem(event.transferId, { verification: "verifying" })
        break
      case "VerificationFinished":
        this.patchItem(event.transferId, {
          verification: event.isValid ? "success" : "failed",
        })
        break
      case "DownloadCompleted":
        this.patchItem(event.transferId, { blobUrl: event.downloadUrl })
        break
      case "TransferCompleted":
        this.patchItem(
          event.transferId,
          {
            status: "completed",
            completedAt: Date.now(),
          },
          true,
        )
        break
      case "TransferFailed":
        this.patchItem(
          event.transferId,
          { status: "failed", error: event.error },
          true,
        )
        break
    }
  }

  private announceStatusChanges(items: TransferItem[]): void {
    for (const item of items) {
      const prev = this.lastStatus.get(item.id)
      if (prev === item.status) continue
      this.lastStatus.set(item.id, item.status)
      if (prev === undefined) continue
      if (item.status === "completed") {
        toast.success(
          item.direction === "receive" ? "File received" : "File sent",
          item.name,
        )
      } else if (item.status === "failed") {
        toast.error("Transfer failed", item.name)
      }
    }
  }

  // --- Actions ---

  public sendFiles(files: File[], overrideIds?: string[]): void {
    if (!this.engine) {
      this.pendingSends.push({ files, overrideIds })
      
      // Emit TransferQueued so the UI updates immediately to show pending state
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const id = overrideIds?.[i] || "pending-" + Math.random().toString(36).substring(7)
        this.handleTransferEvent({
          type: "TransferQueued",
          metadata: {
            transferId: id,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || "application/octet-stream",
            lastModified: file.lastModified,
            chunkCount: 1,
            checksumMethod: "SHA-256-CHUNK-XOR",
            protocolVersion: 1,
          }
        })
      }
      return
    }
    this.engine.sendFiles(files, overrideIds)
  }

  public async accept(ids: string[]): Promise<void> {
    this.set({ incoming: null })
    this.engine?.acceptIncoming(ids)
  }

  public reject(ids: string[]): void {
    this.set({ incoming: null })
    this.engine?.rejectIncoming(ids)
  }

  public pause(id: string): void {
    this.engine?.pause(id)
  }
  public resume(id: string): void {
    this.engine?.resume(id)
  }
  public cancel(id: string): void {
    this.engine?.cancel(id)
  }

  public retry(_id: string): void {
    /* Unsupported by simple engine API */
  }

  public remove(id: string): void {
    this.engine?.cancel(id)
    const item = this.itemsMap.get(id)
    if (item?.blobUrl) {
      URL.revokeObjectURL(item.blobUrl)
    }
    this.itemsMap.delete(id)
    this.scheduleEmit()
  }

  public clearQueue(): void {
    for (const item of this.itemsMap.values()) {
      if (item.blobUrl) {
        URL.revokeObjectURL(item.blobUrl)
      }
    }
    this.itemsMap.clear()
    this.scheduleEmit()
  }

  public destroy(): void {
    if (this.emitTimeout) {
      clearTimeout(this.emitTimeout)
      this.emitTimeout = null
    }
    this.emitScheduled = false

    this.unsubEngine?.()
    this.engine?.destroy()
    this.engine = null

    for (const item of this.itemsMap.values()) {
      if (item.blobUrl) {
        URL.revokeObjectURL(item.blobUrl)
      }
    }
    this.itemsMap.clear()
    this.lastStatus.clear()
    this.state = { ...INITIAL_STATE }
  }

  public detachEngine(): void {
    this.unsubEngine?.()
    this.unsubEngine = null
    this.engine?.destroy()
    this.engine = null

    // Mark any active transfers as failed due to disconnect
    for (const item of this.itemsMap.values()) {
      if (item.status === "progress" || item.status === "pending" || item.status === "paused") {
        this.patchItem(item.id, { status: "failed", error: "Connection lost" })
      }
    }
    this.scheduleEmit()
  }
}
