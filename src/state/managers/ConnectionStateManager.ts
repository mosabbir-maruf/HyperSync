export enum ConnectionState {
  CONNECTING = "CONNECTING",
  SIGNALING = "SIGNALING",
  PAIRING = "PAIRING",
  NEGOTIATING = "NEGOTIATING",
  CONNECTED = "CONNECTED",
  DEGRADED = "DEGRADED",
  RECONNECTING = "RECONNECTING",
  DISCONNECTED = "DISCONNECTED",
  FAILED = "FAILED",
}

export type ConnectionStateEvent = {
  type: "ConnectionChanged"
  state: ConnectionState
} | { type: "PeerConnected" } | { type: "PeerDisconnected" } | {
  type: "Reconnecting"
} | { type: "Connected" } | { type: "Disconnected" } | { type: "Degraded" } | {
  type: "HeartbeatLost"
} | { type: "HeartbeatRecovered" }

type PeerState = "new" | "negotiating" | "connected" | "disconnected" | "failed" | "closed"
type ChannelState = "connecting" | "open" | "closing" | "closed"
type SignalingPhase = "idle" | "starting" | "waiting" | "connecting" | "connected" | "disconnected" | "error"

export class ConnectionStateManager {
  private currentState: ConnectionState = ConnectionState.DISCONNECTED
  private listeners = new Set<(event: ConnectionStateEvent) => void>()

  // Internal inputs
  private peerState: PeerState = "new"
  private transferState: ChannelState = "connecting"
  private messagingState: ChannelState = "connecting"
  private heartbeatHealthy = false
  private signalingPhase: SignalingPhase = "idle"
  private isAutoReconnecting = false

  public getState(): ConnectionState {
    return this.currentState
  }

  public subscribe(fn: (event: ConnectionStateEvent) => void): () => void {
    this.listeners.add(fn)
    // Emit current state immediately to new subscriber
    fn({ type: "ConnectionChanged", state: this.currentState })
    return () => this.listeners.delete(fn)
  }

  private emit(event: ConnectionStateEvent): void {
    for (const fn of this.listeners) fn(event)
  }

  // --- Input updaters ---

  public setPeerState(state: PeerState): void {
    if (this.isDestroyed) return
    this.peerState = state
    this.recalculate()
  }

  public setTransferChannelState(state: ChannelState): void {
    if (this.isDestroyed) return
    this.transferState = state
    this.recalculate()
  }

  public setMessagingChannelState(state: ChannelState): void {
    if (this.isDestroyed) return
    this.messagingState = state
    this.recalculate()
  }

  public setHeartbeatHealthy(healthy: boolean): void {
    if (this.isDestroyed) return
    const previous = this.heartbeatHealthy
    this.heartbeatHealthy = healthy
    if (!previous && healthy) this.emit({ type: "HeartbeatRecovered" })
    if (previous && !healthy) this.emit({ type: "HeartbeatLost" })
    this.recalculate()
  }

  public setSignalingPhase(phase: SignalingPhase): void {
    if (this.isDestroyed) return
    this.signalingPhase = phase
    this.recalculate()
  }

  private isDestroyed = false

  public destroy(): void {
    this.isDestroyed = true
    this.signalingPhase = "disconnected"
    this.peerState = "new"
    this.recalculate()
  }

  public setReconnecting(reconnecting: boolean): void {
    this.isAutoReconnecting = reconnecting
    if (reconnecting) this.emit({ type: "Reconnecting" })
    this.recalculate()
  }

  // --- Core calculation logic ---

  private recalculate(): void {
    const nextState = this.computeState()

    if (nextState !== this.currentState) {
      const prev = this.currentState
      this.currentState = nextState

      this.emit({ type: "ConnectionChanged", state: nextState })

      // Emit semantic events
      if (
        nextState === ConnectionState.CONNECTED &&
        prev !== ConnectionState.CONNECTED
      ) {
        this.emit({ type: "Connected" })
        this.emit({ type: "PeerConnected" })
      } else if (
        nextState === ConnectionState.DISCONNECTED &&
        prev === ConnectionState.CONNECTED
      ) {
        this.emit({ type: "Disconnected" })
        this.emit({ type: "PeerDisconnected" })
      } else if (
        nextState === ConnectionState.DEGRADED &&
        prev === ConnectionState.CONNECTED
      ) {
        this.emit({ type: "Degraded" })
      }
    }
  }

  private computeState(): ConnectionState {
    // 1. Hard fail/disconnect states
    if (
      this.peerState === "failed" ||
      this.peerState === "closed" ||
      this.peerState === "disconnected" ||
      this.signalingPhase === "error" ||
      this.signalingPhase === "disconnected"
    ) {
      if (this.isAutoReconnecting) return ConnectionState.RECONNECTING
      return this.peerState === "failed" || this.signalingPhase === "error"
        ? ConnectionState.FAILED
        : ConnectionState.DISCONNECTED
    }

    // 2. Reconnecting state overrides
    if (this.isAutoReconnecting) {
      return ConnectionState.RECONNECTING
    }

    // 3. WebRTC connected state evaluation
    if (this.peerState === "connected") {
      const bothChannelsOpen =
        this.transferState === "open" && this.messagingState === "open"

      if (bothChannelsOpen && this.heartbeatHealthy) {
        return ConnectionState.CONNECTED
      }

      // Give channels a chance to open before marking as degraded
      if (
        this.transferState === "connecting" ||
        this.messagingState === "connecting"
      ) {
        return ConnectionState.CONNECTING
      }

      // If WebRTC says connected, but channels aren't ready (or failed) or heartbeat is dead, it's degraded.
      return ConnectionState.DEGRADED
    }

    // 4. In-progress states
    if (
      this.peerState === "negotiating" ||
      this.signalingPhase === "connecting"
    ) {
      return ConnectionState.NEGOTIATING
    }

    if (this.signalingPhase === "waiting") {
      return ConnectionState.PAIRING
    }

    if (this.signalingPhase === "starting") {
      return ConnectionState.SIGNALING
    }

    // 5. Default
    return ConnectionState.CONNECTING
  }
}
