import {
  ConnectionState,
  type ConnectionStateEvent,
} from "./ConnectionStateManager"
import type { PeerConnectionState } from "../../lib/webrtc/PeerConnection"

type ChannelState = "connecting" | "open" | "closing" | "closed"
type SignalingPhase = "idle" | "starting" | "waiting" | "connecting" | "connected" | "disconnected" | "error"

interface PeerConnectionStatus {
  peerState: PeerConnectionState
  transferState: ChannelState
  messagingState: ChannelState
  heartbeatHealthy: boolean
}

export class GroupConnectionManager {
  private currentState: ConnectionState = ConnectionState.DISCONNECTED
  private listeners = new Set<(event: ConnectionStateEvent) => void>()

  // Group-level signaling
  private signalingPhase: SignalingPhase = "idle"

  // Peer-level tracking
  private peers = new Map<string, PeerConnectionStatus>()

  public getState(): ConnectionState {
    return this.currentState
  }

  public subscribe(fn: (event: ConnectionStateEvent) => void): () => void {
    this.listeners.add(fn)
    fn({ type: "ConnectionChanged", state: this.currentState })
    return () => this.listeners.delete(fn)
  }

  private emit(event: ConnectionStateEvent): void {
    for (const fn of this.listeners) fn(event)
  }

  // --- Group Updaters ---
  public setSignalingPhase(phase: SignalingPhase): void {
    this.signalingPhase = phase
    this.recalculate()
  }

  // --- Peer Updaters ---
  private ensurePeer(peerId: string): PeerConnectionStatus {
    let p = this.peers.get(peerId)
    if (!p) {
      p = {
        peerState: "new",
        transferState: "connecting",
        messagingState: "connecting",
        heartbeatHealthy: true, // assume healthy until we know otherwise
      }
      this.peers.set(peerId, p)
    }
    return p
  }

  public setPeerState(peerId: string, state: PeerConnectionState): void {
    const p = this.ensurePeer(peerId)
    p.peerState = state
    this.recalculate()
  }

  public setTransferChannelState(peerId: string, state: ChannelState): void {
    const p = this.ensurePeer(peerId)
    p.transferState = state
    this.recalculate()
  }

  public setMessagingChannelState(peerId: string, state: ChannelState): void {
    const p = this.ensurePeer(peerId)
    p.messagingState = state
    this.recalculate()
  }

  public setHeartbeatHealthy(peerId: string, healthy: boolean): void {
    const p = this.ensurePeer(peerId)
    p.heartbeatHealthy = healthy
    this.recalculate()
  }

  public removePeer(peerId: string): void {
    this.peers.delete(peerId)
    this.recalculate()
  }

  // --- Core calculation logic ---

  private recalculate(): void {
    const nextState = this.computeState()

    if (nextState !== this.currentState) {
      const prev = this.currentState
      this.currentState = nextState

      this.emit({ type: "ConnectionChanged", state: nextState })

      // Emit semantic events based on overall group state
      if (
        nextState === ConnectionState.CONNECTED &&
        prev !== ConnectionState.CONNECTED
      ) {
        this.emit({ type: "Connected" })
      } else if (
        nextState === ConnectionState.DISCONNECTED &&
        prev === ConnectionState.CONNECTED
      ) {
        this.emit({ type: "Disconnected" })
      }
    }
  }

  private computeState(): ConnectionState {
    // 1. If signaling completely fails
    if (this.signalingPhase === "error") {
      return ConnectionState.FAILED
    }
    if (this.signalingPhase === "disconnected") {
      return ConnectionState.DISCONNECTED
    }

    // 2. If there are peers, aggregate their state
    if (this.peers.size > 0) {
      let anyConnected = false
      let anyConnecting = false
      let allFailedOrClosed = true

      for (const p of this.peers.values()) {
        const isConnected =
          p.peerState === "connected" &&
          p.transferState === "open" &&
          p.messagingState === "open"
        if (isConnected) {
          anyConnected = true
          allFailedOrClosed = false
        } else if (
          p.peerState === "new" ||
          p.peerState === "negotiating" ||
          p.transferState === "connecting" ||
          p.messagingState === "connecting"
        ) {
          anyConnecting = true
          allFailedOrClosed = false
        }
      }

      if (anyConnected) {
        return ConnectionState.CONNECTED // Group is operational if at least one connection works
      }

      if (anyConnecting) {
        return ConnectionState.NEGOTIATING
      }

      if (allFailedOrClosed) {
        // We have peers but all of them are dead.
        return ConnectionState.DEGRADED // or FAILED, but DEGRADED is safer for "still in room but no active peers"
      }
    }

    // 3. Fallbacks based on signaling phase
    if (this.signalingPhase === "connected") {
      // In group room, but no peers currently connected (e.g., you're alone or others dropped)
      return ConnectionState.DEGRADED
    }
    
    if (this.signalingPhase === "connecting") {
      return ConnectionState.CONNECTING
    }

    if (this.signalingPhase === "waiting") {
      return ConnectionState.PAIRING
    }

    if (this.signalingPhase === "starting") {
      return ConnectionState.SIGNALING
    }

    return ConnectionState.CONNECTING
  }
}
