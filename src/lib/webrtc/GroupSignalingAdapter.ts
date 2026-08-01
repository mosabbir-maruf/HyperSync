import type {
  SignalingClient,
  PeerSignal,
  DevicePresence,
  SessionInfo,
  SignalingEvent,
  SignalingEventType,
  Unsubscribe,
  SignalingEventHandler,
} from "../signaling"

/**
 * Adapts the Group-aware SignalingClient into a 1-to-1 SignalingClient for a specific target peer.
 * This allows the existing PeerConnection (which only knows about 1-to-1) to be used unmodified
 * in a mesh network of peers.
 */
export class GroupSignalingAdapter implements SignalingClient {
  private unsubscribers: Unsubscribe[] = []
  private peerJoinedHandlers: (event: {
    type: "peer-joined"
    peerId: string
  }) => void[] = []

  constructor(
    private readonly base: SignalingClient,
    private readonly targetPeerId: string,
  ) {}

  on<T extends SignalingEventType,>(
    type: T,
    handler: SignalingEventHandler<T>,
  ): Unsubscribe {
    if (type === "signal") {
      // Map 'group-signal' from targetPeerId to 'signal'
      const unsub = this.base.on("group-signal", (event) => {
        if (event.from === this.targetPeerId) {
          const fn = handler as any
          fn({
            type: "signal",
            from: event.from,
            signal: event.signal,
          })
        }
      })
      this.unsubscribers.push(unsub)
      return unsub
    } else if (type === "peer-left") {
      // Map 'group-peer-left' from targetPeerId to 'peer-left'
      const unsub = this.base.on("group-peer-left", (event) => {
        if (event.peerId === this.targetPeerId) {
          const fn = handler as any
          fn({
            type: "peer-left",
            peerId: event.peerId,
          })
        }
      })
      this.unsubscribers.push(unsub)
      return unsub
    } else {
      // Forward other events verbatim (though most aren't needed by PeerConnection)
      const unsub = this.base.on(type, handler)
      this.unsubscribers.push(unsub)

      // Store local peer-joined handlers to trigger them manually later
      if (type === "peer-joined") {
        this.peerJoinedHandlers.push(handler as any)
      }
      return unsub
    }
  }

  simulatePeerJoined(): void {
    for (const handler of this.peerJoinedHandlers) {
      handler({ type: "peer-joined", peerId: this.targetPeerId })
    }
  }

  send(signal: PeerSignal): void {
    // Map 1-to-1 send to group send
    this.base.sendGroupSignal(this.targetPeerId, signal)
  }

  // Pass-through stubs for other SignalingClient methods since PeerConnection doesn't use them
  createSession(): Promise<SessionInfo> {
    return this.base.createSession()
  }
  joinSession(code: string): Promise<SessionInfo> {
    return this.base.joinSession(code)
  }
  createGroup(maxMembers?: number): Promise<SessionInfo> {
    return this.base.createGroup(maxMembers)
  }
  joinGroup(code: string): Promise<SessionInfo> {
    return this.base.joinGroup(code)
  }
  sendGroupSignal(targetPeerId: string, signal: PeerSignal): void {
    this.base.sendGroupSignal(targetPeerId, signal)
  }
  announce(profile: Omit<DevicePresence, "peerId">): void {
    this.base.announce(profile)
  }
  invite(targetPeerId: string, code: string): void {
    this.base.invite(targetPeerId, code)
  }
  close(): void {} // Base handles the actual closing

  destroy(): void {
    for (const unsub of this.unsubscribers) unsub()
    this.unsubscribers = []
  }
}
