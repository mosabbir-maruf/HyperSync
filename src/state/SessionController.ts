import { createSignalingClient } from "../lib/signaling"
import type { SessionInfo } from "../lib/signaling"
import {
  PeerConnection,
  type PeerConnectionState,
} from "../lib/webrtc/PeerConnection"
import { TransferEngine } from "../lib/transfer/TransferEngine"
import type {
  FileMetadata,
  TransferItem,
  TransferEvent,
} from "../lib/transfer/types"
import { toast } from "../lib/notify/toast"
import { appError, toAppError } from "../lib/errors"

export type SessionPhase = "idle" | "starting" | "waiting" | "connecting" | "connected" | "disconnected" | "error"

export interface SessionState {
  phase: SessionPhase
  role: "host" | "guest" | null
  info: SessionInfo | null
  peerState: PeerConnectionState
  items: TransferItem[]
  incoming: FileMetadata[] | null
  error: string | null
}

const INITIAL: SessionState = {
  phase: "idle",
  role: null,
  info: null,
  peerState: "new",
  items: [],
  incoming: null,
  error: null,
}

export class SessionController {
  private state: SessionState = INITIAL
  private listeners = new Set<(s: SessionState) => void>()
  private signaling = createSignalingClient()
  private peer: PeerConnection | null = null
  private engine: TransferEngine | null = null
  private itemsMap = new Map<string, TransferItem>()
  private lastStatus = new Map<string, TransferItem["status"]>()
  private emitScheduled = false
  private emitTimeout: number | null = null
  private _hostingInProgress = false
  private _joiningInProgress = false

  subscribe(fn: (s: SessionState) => void): () => void {
    this.listeners.add(fn)
    fn(this.state)
    return () => this.listeners.delete(fn)
  }

  getState(): SessionState {
    return this.state
  }

  private set(patch: Partial<SessionState>): void {
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
    // Cancel any pending debounced emit and flush immediately
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
    this.itemsMap.set(id, { ...cur, ...patch })
    if (immediate) {
      this.flushNow()
    } else {
      this.scheduleEmit()
    }
  }

  async host(): Promise<SessionInfo | null> {
    // Guard against React Strict Mode double-invoke or concurrent calls
    if (this.state.phase !== "idle" || this._hostingInProgress) return null
    this._hostingInProgress = true
    this.set({ phase: "starting", role: "host", error: null })
    try {
      const info = await this.signaling.createSession()
      this.attachPeer("host")
      this.set({ phase: "waiting", info })
      return info
    } catch (err) {
      this.fail(err, "error")
      return null
    } finally {
      this._hostingInProgress = false
    }
  }

  async join(code: string): Promise<void> {
    // Guard against CodeInput double-fire or concurrent calls
    if (this.state.phase !== "idle" || this._joiningInProgress) return
    this._joiningInProgress = true
    this.set({ phase: "starting", role: "guest", error: null })
    try {
      const info = await this.signaling.joinSession(code)
      this.attachPeer("guest")
      this.set({ phase: "connecting", info })
    } catch (err) {
      this.fail(err, "error")
    } finally {
      this._joiningInProgress = false
    }
  }

  private attachPeer(role: "host" | "guest"): void {
    this.signaling.on("peer-joined", () => {
      if (this.state.phase === "waiting") this.set({ phase: "connecting" })
    })
    this.signaling.on("peer-left", () => {
      this.set({ phase: "disconnected", peerState: "disconnected" })
      toast.warning("The other device left.")
    })
    this.signaling.on("error", (e) => this.fail(appError("network", e.message)))

    this.peer = new PeerConnection(this.signaling, role, {
      onState: (peerState) => {
        this.set({ peerState })
        if (peerState === "connected") {
          // Always move to connected phase when WebRTC reports success.
          // The data channel may already be open or will open momentarily.
          this.set({ phase: "connected" })
          toast.success("Connected", "Devices are now linked directly.")
        }
        if (peerState === "failed") {
          this.fail(appError("network", "Connection failed"), "error")
        }
        if (peerState === "disconnected") this.set({ phase: "disconnected" })
      },
      onDataChannel: (channel) => this.attachChannel(channel),
      onError: (msg) => this.fail(appError("network", msg)),
    })
  }

  private attachChannel(channel: RTCDataChannel): void {
    this.engine = new TransferEngine(channel)
    this.engine.onEvent((event: TransferEvent) =>
      this.handleTransferEvent(event),
    )

    // Ensure phase=connected regardless of when the channel opens.
    // If already open (host side), update immediately.
    // If not yet open (guest side), listen for onopen.
    const markOpen = () => {
      this.set({ phase: "connected" })
    }
    if (channel.readyState === "open") {
      markOpen()
    } else {
      channel.addEventListener("open", markOpen, { once: true })
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
        this.patchItem(p.transferId, {
          status: "progress",
          bytesTransferred: transferred,
          speed: p.speedBytesPerSecond,
          eta: p.estimatedTimeRemainingSeconds,
          remainingBytes: p.totalBytes - transferred,
          connectionQuality: quality,
        })
        break
      }
      case "BufferPause":
      case "BufferResume":
        // Internal flow control throttling — keep status as "progress" in UI
        break
      case "TransferCancelled":
        this.patchItem(event.transferId, { status: "cancelled" }, true)
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

  sendFiles(files: File[]): void {
    if (!this.engine) return
    this.engine.sendFiles(files)
  }

  async accept(ids: string[]): Promise<void> {
    this.set({ incoming: null })
    this.engine?.acceptIncoming(ids)
  }

  reject(ids: string[]): void {
    this.set({ incoming: null })
    this.engine?.rejectIncoming(ids)
  }

  pause(id: string): void {
    this.engine?.pause(id)
  }
  resume(id: string): void {
    this.engine?.resume(id)
  }
  cancel(id: string): void {
    this.engine?.cancel(id)
  }

  retry(_id: string): void {
    /* Unsupported by simple engine API */
  }
  move(_id: string, _toIndex: number): void {
    /* Unsupported by simple engine API */
  }

  remove(id: string): void {
    this.engine?.cancel(id)
    const item = this.itemsMap.get(id)
    if (item?.blobUrl) {
      URL.revokeObjectURL(item.blobUrl)
    }
    this.itemsMap.delete(id)
    this.scheduleEmit()
  }

  clearQueue(): void {
    for (const item of this.itemsMap.values()) {
      if (item.blobUrl) {
        URL.revokeObjectURL(item.blobUrl)
      }
    }
    this.itemsMap.clear()
    this.scheduleEmit()
  }

  leave(): void {
    if (this.emitTimeout) {
      clearTimeout(this.emitTimeout)
      this.emitTimeout = null
    }
    this.emitScheduled = false
    this.engine?.destroy()
    this.peer?.close()
    this.signaling.close()
    this.engine = null
    this.peer = null
    for (const item of this.itemsMap.values()) {
      if (item.blobUrl) {
        URL.revokeObjectURL(item.blobUrl)
      }
    }
    this.itemsMap.clear()
    this.lastStatus.clear()
    this.signaling = createSignalingClient()
    this.set({ ...INITIAL })
  }

  private fail(err: unknown, phase?: SessionPhase): void {
    const appErr = toAppError(err)
    this.set({ error: appErr.message, ...(phase ? { phase } : {}) })
    toast.error(appErr.message, appErr.hint)
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
}
