import type { SessionInfo } from "../../lib/signaling"
import { TransferEngine } from "../../lib/transfer/TransferEngine"
import type { TransferItem, FileMetadata } from "../../lib/transfer/types"

import {
  ConnectionStateManager,
  ConnectionState,
} from "./ConnectionStateManager"
import { TransferManager, type TransferState } from "./TransferManager"
import { MessagingManager } from "./MessagingManager"
import { PeerManager } from "./PeerManager"
import { PresenceManager } from "./PresenceManager"

export interface SessionState {
  connectionState: ConnectionState
  role: "host" | "guest" | null
  info: SessionInfo | null
  items: TransferItem[]
  incoming: FileMetadata[] | null
  error: string | null
}

const INITIAL: SessionState = {
  connectionState: ConnectionState.DISCONNECTED,
  role: null,
  info: null,
  items: [],
  incoming: null,
  error: null,
}

export class SessionManager {
  public connection = new ConnectionStateManager()
  public transfer = new TransferManager()
  public messaging: MessagingManager | null = null

  private peer = new PeerManager()
  private presence = new PresenceManager(this.connection)

  private state: SessionState = { ...INITIAL }
  private listeners = new Set<(s: SessionState) => void>()
  private polls: number[] = []

  constructor() {
    // 1. PeerManager -> ConnectionStateManager
    this.peer.setCallbacks({
      onPhaseChange: (phase) => {
        this.connection.setSignalingPhase(phase)
        this.set({ connectionState: this.connection.getState() })
      },
      onPeerStateChange: (state) => {
        this.connection.setPeerState(state)
      },
      onDataChannel: (channel) => {
        const engine = new TransferEngine(channel)
        this.transfer.attachEngine(engine)

        const markOpen = () => this.connection.setTransferChannelState("open")
        const markClosed = () =>
          this.connection.setTransferChannelState("closed")

        if (channel.readyState === "open") markOpen()
        else {
          channel.addEventListener("open", markOpen, { once: true })
          const poll = setInterval(() => {
            if (channel.readyState === "open") {
              clearInterval(poll)
              markOpen()
            } else if (
              channel.readyState === "closed" ||
              channel.readyState === "closing"
            ) {
              clearInterval(poll)
            }
          }, 100)
        }
        channel.addEventListener("close", markClosed, { once: true })
      },
      onMessageChannel: (channel) => {
        this.messaging?.destroy()
        this.messaging = new MessagingManager(channel)

        // Presence listens to messaging engine
        this.presence.observe((fn) => this.messaging!.onEngineEvent(fn))

        const markOpen = () => this.connection.setMessagingChannelState("open")
        const markClosed = () =>
          this.connection.setMessagingChannelState("closed")

        if (channel.readyState === "open") markOpen()
        else {
          channel.addEventListener("open", markOpen, { once: true })
          const poll = setInterval(() => {
            if (channel.readyState === "open") {
              clearInterval(poll)
              markOpen()
            } else if (
              channel.readyState === "closed" ||
              channel.readyState === "closing"
            ) {
              clearInterval(poll)
            }
          }, 100)
        }
        channel.addEventListener("close", markClosed, { once: true })
      },
      onError: (msg) => {
        this.set({ error: msg })
        if (msg.includes("disconnected temporarily")) {
          this.connection.setHeartbeatHealthy(false)
        }
      },
    })

    // 2. ConnectionStateManager -> SessionManager state
    this.connection.subscribe((event) => {
      if (event.type === "ConnectionChanged") {
        this.set({ connectionState: event.state })
      }
    })

    // 3. TransferManager -> SessionManager state
    this.transfer.subscribe((transferState) => {
      this.set({
        items: transferState.items,
        incoming: transferState.incoming,
      })
    })
  }

  // --- React Subscription ---

  public subscribe(fn: (s: SessionState) => void): () => void {
    this.listeners.add(fn)
    fn(this.state)
    return () => this.listeners.delete(fn)
  }

  public getState(): SessionState {
    return this.state
  }

  public getMessagingManager(): MessagingManager | null {
    return this.messaging
  }

  private set(patch: Partial<SessionState>): void {
    this.state = { ...this.state, ...patch }
    for (const fn of this.listeners) fn(this.state)
  }

  // --- Public API ---

  public async host(): Promise<SessionInfo | null> {
    this.set({ role: "host", error: null })
    const info = await this.peer.host()
    if (info) this.set({ info })
    return info
  }

  public async join(code: string): Promise<void> {
    this.set({ role: "guest", error: null })
    const info = await this.peer.join(code)
    if (info) this.set({ info })
  }

  public sendFiles(files: File[]): void {
    this.transfer.sendFiles(files)
  }

  public async accept(ids: string[]): Promise<void> {
    return this.transfer.accept(ids)
  }

  public reject(ids: string[]): void {
    this.transfer.reject(ids)
  }

  public pause(id: string): void {
    this.transfer.pause(id)
  }

  public resume(id: string): void {
    this.transfer.resume(id)
  }

  public cancel(id: string): void {
    this.transfer.cancel(id)
  }

  public retry(id: string): void {
    this.transfer.retry(id)
  }

  public remove(id: string): void {
    this.transfer.remove(id)
  }

  public clearQueue(): void {
    this.transfer.clearQueue()
  }

  public leave(): void {
    this.peer.destroy()
    this.connection.destroy()
    this.transfer.destroy()
    this.messaging?.destroy()
    this.presence.destroy()
    this.polls.forEach(clearTimeout)
    this.polls = []
    this.messaging = null
    this.set({ ...INITIAL })
  }
}
