import type { SessionInfo } from "../../lib/signaling"
import { TransferEngine } from "../../lib/transfer/TransferEngine"
import type { TransferItem, FileMetadata } from "../../lib/transfer/types"

import { GroupConnectionManager } from "./GroupConnectionManager"
import { GroupTransferManager } from "./GroupTransferManager"
import { GroupMessagingManager } from "./GroupMessagingManager"
import { GroupPeerManager } from "./GroupPeerManager"
import { ConnectionState } from "./ConnectionStateManager"

export interface GroupSessionState {
  connectionState: string // from ConnectionState
  role: "host" | "member" | null
  info: SessionInfo | null
  items: Array<TransferItem & { peerId?: string }>
  incoming: Array<FileMetadata & { peerId?: string }> | null
  error: string | null
  typingPeers: string[]
}

const INITIAL: GroupSessionState = {
  connectionState: ConnectionState.DISCONNECTED,
  role: null,
  info: null,
  items: [],
  incoming: null,
  error: null,
  typingPeers: [],
}

export class GroupSessionManager {
  public connection = new GroupConnectionManager()
  public transfer = new GroupTransferManager()
  public messaging = new GroupMessagingManager()

  private peer = new GroupPeerManager()

  private state: GroupSessionState = { ...INITIAL }
  private listeners = new Set<(s: GroupSessionState) => void>()

  constructor() {
    this.peer.setCallbacks({
      onPhaseChange: (phase) => {
        this.connection.setSignalingPhase(phase as any)
      },
      onPeerStateChange: (peerId, state) => {
        this.connection.setPeerState(peerId, state)
      },
      onDataChannel: (peerId, channel) => {
        const engine = new TransferEngine(channel)
        this.transfer.attachEngine(peerId, engine)

        const markOpen = () =>
          this.connection.setTransferChannelState(peerId, "open")
        const markClosed = () =>
          this.connection.setTransferChannelState(peerId, "closed")

        if (channel.readyState === "open") markOpen()
        else {
          channel.addEventListener("open", markOpen, { once: true })
        }
        channel.addEventListener("close", markClosed, { once: true })
      },
      onMessageChannel: (peerId, channel) => {
        this.messaging.attachEngine(peerId, channel)

        const markOpen = () =>
          this.connection.setMessagingChannelState(peerId, "open")
        const markClosed = () =>
          this.connection.setMessagingChannelState(peerId, "closed")

        if (channel.readyState === "open") markOpen()
        else {
          channel.addEventListener("open", markOpen, { once: true })
        }
        channel.addEventListener("close", markClosed, { once: true })
      },
      onError: (msg) => {
        this.set({ error: msg })
      },
      onMemberLeft: (peerId) => {
        this.connection.removePeer(peerId)
        this.transfer.removeEngine(peerId)
        this.messaging.removeEngine(peerId)
      },
    })

    this.connection.subscribe((event) => {
      if (event.type === "ConnectionChanged") {
        this.set({ connectionState: event.state })
      }
    })

    this.transfer.subscribe((transferState) => {
      this.set({
        items: transferState.items as Array<TransferItem & { peerId?: string }>,
        incoming: transferState.incoming as Array<FileMetadata & { peerId?: string }> | null,
      })
    })

    this.messaging.subscribe((msgState) => {
      this.set({ typingPeers: msgState.typingPeers })
    })
  }

  // --- React Subscription ---

  public subscribe(fn: (s: GroupSessionState) => void): () => void {
    this.listeners.add(fn)
    fn(this.state)
    return () => this.listeners.delete(fn)
  }

  public getState(): GroupSessionState {
    return this.state
  }

  public getMessagingManager(): GroupMessagingManager {
    return this.messaging
  }

  private set(patch: Partial<GroupSessionState>): void {
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
    this.set({ role: "member", error: null })
    const info = await this.peer.join(code)
    if (info) this.set({ info })
  }

  public sendFiles(files: File[], targetPeerId?: string): void {
    this.transfer.sendFiles(files, targetPeerId)
  }

  public async accept(ids: string[], peerId?: string): Promise<void> {
    return this.transfer.accept(ids, peerId)
  }

  public reject(ids: string[], peerId?: string): void {
    this.transfer.reject(ids, peerId)
  }

  public pause(id: string, peerId?: string): void {
    this.transfer.pause(id, peerId)
  }

  public resume(id: string, peerId?: string): void {
    this.transfer.resume(id, peerId)
  }

  public cancel(id: string, peerId?: string): void {
    this.transfer.cancel(id, peerId)
  }

  public retry(id: string, peerId?: string): void {
    this.transfer.retry(id, peerId)
  }

  public remove(id: string, peerId?: string): void {
    this.transfer.remove(id, peerId)
  }

  public clearQueue(): void {
    this.transfer.clearQueue()
  }

  public leave(): void {
    this.peer.destroy()
    this.connection.destroy()
    this.transfer.destroy()
    this.messaging.destroy()
    this.set({ ...INITIAL })
  }
}
