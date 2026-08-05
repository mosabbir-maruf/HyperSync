import { createSignalingClient, type PeerSignal } from "../../lib/signaling"
import type { SessionInfo, Role } from "../../lib/signaling"
import {
  PeerConnection,
  type PeerConnectionState,
} from "../../lib/webrtc/PeerConnection"
import { GroupSignalingAdapter } from "../../lib/webrtc/GroupSignalingAdapter"
import { toast } from "../../lib/notify/toast"
import { appError, toAppError } from "../../lib/errors"

export class GroupPeerManager {
  private static readonly MAX_RECONNECT_ATTEMPTS = 6
  private static readonly RECONNECT_BASE_DELAY_MS = 1_000
  private static readonly RECONNECT_MAX_DELAY_MS = 30_000

  private signaling = createSignalingClient()
  private peers = new Map<string, PeerConnection>()
  private adapters = new Map<string, GroupSignalingAdapter>()

  // Role each peer was originally assigned in the mesh. Reconnections reuse it
  // so the offerer/answerer split stays complementary and glare is impossible.
  private peerRoles = new Map<string, "host" | "guest">()

  // Reconnection bookkeeping for peers whose connection dropped.
  private reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private reconnectAttempts = new Map<string, number>()
  private doNotReconnect = new Set<string>()

  private _hostingInProgress = false
  private _joiningInProgress = false
  private localRole: Role | null = null

  private onPhaseChange: (phase: string) => void = () => {}
  private onPeerStateChange: (
    peerId: string,
    state: PeerConnectionState,
  ) => void = () => {}
  private onDataChannel: (peerId: string, channel: RTCDataChannel) => void =
    () => {}
  private onMessageChannel: (peerId: string, channel: RTCDataChannel) => void =
    () => {}
  private onError: (error: string) => void = () => {}
  private onMemberLeft: (peerId: string) => void = () => {}

  public setCallbacks(cbs: {
    onPhaseChange: (phase: string) => void
    onPeerStateChange: (peerId: string, state: PeerConnectionState) => void
    onDataChannel: (peerId: string, channel: RTCDataChannel) => void
    onMessageChannel: (peerId: string, channel: RTCDataChannel) => void
    onError: (error: string) => void
    onMemberLeft: (peerId: string) => void
  }) {
    this.onPhaseChange = cbs.onPhaseChange
    this.onPeerStateChange = cbs.onPeerStateChange
    this.onDataChannel = cbs.onDataChannel
    this.onMessageChannel = cbs.onMessageChannel
    this.onError = cbs.onError
    this.onMemberLeft = cbs.onMemberLeft
  }

  public getPeers(): Map<string, PeerConnection> {
    return this.peers
  }

  public async host(): Promise<SessionInfo | null> {
    if (this._hostingInProgress) return null
    this._hostingInProgress = true
    this.onPhaseChange("starting")

    try {
      const info = await this.signaling.createGroup(8)
      this.localRole = "host"
      this.attachSignaling()
      this.onPhaseChange("waiting") // waiting for members to join
      return info
    } catch (err) {
      this.fail(err, "error")
      return null
    } finally {
      this._hostingInProgress = false
    }
  }

  public async join(code: string): Promise<SessionInfo | null> {
    if (this._joiningInProgress) return null
    this._joiningInProgress = true
    this.onPhaseChange("starting")

    try {
      const info = await this.signaling.joinGroup(code)
      this.localRole = "member"
      this.attachSignaling()
      this.onPhaseChange("connecting") // connecting to existing members
      return info
    } catch (err) {
      this.fail(err, "error")
      return null
    } finally {
      this._joiningInProgress = false
    }
  }

  private attachSignaling(): void {
    this.signaling.on("group-peer-joined", (event) => {
      // A peer that previously left may re-join the room, so clear any
      // "do not reconnect" marker and any stale reconnection bookkeeping.
      this.doNotReconnect.delete(event.peerId)
      this.reconnectAttempts.delete(event.peerId)
      this.clearReconnectTimer(event.peerId)

      // If a stale PC exists for this peer from a prior failed reconnect,
      // tear it down so we can establish a proper host connection. Only
      // tear down non-connected PCs — never interrupt an active connection.
      const stale = this.peers.get(event.peerId)
      if (stale && stale.connectionState !== "connected") {
        this.cleanupPeer(event.peerId)
      }

      // If a new member joins, and we are already in the group, we act as the "host" (offerer)
      // to establish a connection with them.
      this.establishMeshConnection(event.peerId, "host")
      // In group mode, when someone joins, we consider the room "connected/active"
      this.onPhaseChange("connected")
    })

    // Also we need to establish connections to members who were already in the room when we joined.
    // They will act as "host" (offerer) to us, so we must act as "guest" (answerer) and handle their signals.
    // However, the `group-signal` will trigger the creation of a PeerConnection if it doesn't exist yet!
    this.signaling.on("group-signal", (event) => {
      const existing = this.peers.get(event.from)
      if (!existing) {
        this.establishMeshConnection(event.from, "guest", event.signal)
        this.onPhaseChange("connected")
        return
      }
      // Tear down the zombie PC only for an OFFER signal when the existing
      // PC is truly dead (closed or failed). Answers and ICE candidates
      // always flow through the adapter. A PC in any other state (new,
      // negotiating, disconnected, or connected) is still alive and should
      // not be torn down.
      if (
        event.signal.kind === "offer" &&
        (existing.connectionState === "closed" ||
          existing.connectionState === "failed")
      ) {
        this.cleanupPeer(event.from)
        this.establishMeshConnection(event.from, "guest", event.signal)
        this.onPhaseChange("connected")
      }
    })

    this.signaling.on("group-peer-left", (event) => {
      // The peer intentionally left: tear it down and never reconnect.
      this.doNotReconnect.add(event.peerId)
      this.cleanupPeer(event.peerId)
      this.peerRoles.delete(event.peerId)
    })

    this.signaling.on("error", (e) => {
      if (e.message.includes("disconnected temporarily")) {
        console.warn("[GroupWebRTC] signaling error:", e.message)
        return
      }
      this.fail(appError("network", e.message))
    })
  }

  private establishMeshConnection(
    targetPeerId: string,
    role: "host" | "guest",
    initialSignal?: PeerSignal,
  ) {
    if (this.peers.has(targetPeerId)) return

    this.peerRoles.set(targetPeerId, role)

    const adapter = new GroupSignalingAdapter(this.signaling, targetPeerId)
    this.adapters.set(targetPeerId, adapter)

    const peer = new PeerConnection(
      adapter,
      role,
      {
        onState: (peerState) => {
          this.onPeerStateChange(targetPeerId, peerState)

          if (peerState === "connected") {
            // Healthy — reset any reconnection backoff for this peer.
            this.reconnectAttempts.delete(targetPeerId)
            this.clearReconnectTimer(targetPeerId)
          } else if (peerState === "failed" || peerState === "closed") {
            if (this.doNotReconnect.has(targetPeerId)) return
            if (!this.peers.has(targetPeerId)) return
            console.warn(
              `[GroupWebRTC] Peer connection ${peerState} to ${targetPeerId}. Scheduling reconnect...`,
            )
            this.cleanupPeer(targetPeerId)
            this.scheduleReconnect(targetPeerId)
          }
        },
        onDataChannel: (channel) => this.onDataChannel(targetPeerId, channel),
        onMessageChannel: (channel) =>
          this.onMessageChannel(targetPeerId, channel),
        onError: (msg) =>
          console.error(`[GroupWebRTC] Peer error with ${targetPeerId}:`, msg),
      },
      targetPeerId,
    )

    this.peers.set(targetPeerId, peer)

    // The PeerConnection constructor will start negotiation if role==="host".
    // Since adapter is bound, it will automatically route `signal` to `group-signal`.
    // We kick off the "peer-joined" event artificially on the adapter so the host knows to start offering.
    if (role === "host") {
      adapter.simulatePeerJoined()
    } else if (initialSignal) {
      adapter.simulateSignal(initialSignal)
    }
  }

  private cleanupPeer(peerId: string): void {
    const pc = this.peers.get(peerId)
    if (!pc) return
    // Remove before close() so the close-triggered onState("closed") is a no-op.
    this.peers.delete(peerId)
    pc.close()

    const adapter = this.adapters.get(peerId)
    if (adapter) {
      adapter.destroy()
      this.adapters.delete(peerId)
    }
    this.clearReconnectTimer(peerId)
    this.onMemberLeft(peerId)
  }

  private scheduleReconnect(peerId: string): void {
    if (this.reconnectTimers.has(peerId)) return
    if (this.doNotReconnect.has(peerId)) return

    const attempts = this.reconnectAttempts.get(peerId) ?? 0
    if (attempts >= GroupPeerManager.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts.delete(peerId)
      return
    }
    this.reconnectAttempts.set(peerId, attempts + 1)

    const delay = Math.min(
      GroupPeerManager.RECONNECT_BASE_DELAY_MS * 2 ** attempts,
      GroupPeerManager.RECONNECT_MAX_DELAY_MS,
    )
    const timer = setTimeout(() => {
      this.reconnectTimers.delete(peerId)
      this.tryReconnect(peerId)
    }, delay)
    this.reconnectTimers.set(peerId, timer)
  }

  private tryReconnect(peerId: string): void {
    if (this.peers.has(peerId)) return
    if (this.doNotReconnect.has(peerId)) return

    // Invert the original role: the side that was guest reconnects as host
    // (sends offer immediately) and the side that was host reconnects as
    // guest. Inversion preserves complementarity — exactly one offerer, zero
    // glare — and eliminates the waiting-guest deadlock when only one side
    // detected the failure.
    const original = this.peerRoles.get(peerId) ?? "host"
    const role = original === "host" ? "guest" : "host"
    console.log(
      `[GroupWebRTC] Reconnecting to ${peerId} (attempt ${
        this.reconnectAttempts.get(peerId) ?? 0
      })`,
    )
    this.establishMeshConnection(peerId, role)
  }

  private clearReconnectTimer(peerId: string): void {
    const timer = this.reconnectTimers.get(peerId)
    if (timer) {
      clearTimeout(timer)
      this.reconnectTimers.delete(peerId)
    }
  }

  private fail(err: unknown, phase?: string): void {
    const appErr = toAppError(err)
    if (phase) this.onPhaseChange(phase)
    this.onError(appErr.message)
    toast.error(appErr.message, appErr.hint)
  }

  public destroy(): void {
    for (const timer of this.reconnectTimers.values()) clearTimeout(timer)
    this.reconnectTimers.clear()
    this.reconnectAttempts.clear()
    this.doNotReconnect.clear()
    this.peerRoles.clear()

    for (const [peerId, pc] of this.peers.entries()) {
      pc.close()
    }
    this.peers.clear()

    for (const [peerId, adapter] of this.adapters.entries()) {
      adapter.destroy()
    }
    this.adapters.clear()

    this.signaling.close()
    this.signaling = createSignalingClient()
  }
}
