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
  private signaling = createSignalingClient()
  private peers = new Map<string, PeerConnection>()
  private adapters = new Map<string, GroupSignalingAdapter>()

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
      if (!this.peers.has(event.from)) {
        this.establishMeshConnection(event.from, "guest", event.signal)
        // Set phase to connected since we're now actively negotiating
        this.onPhaseChange("connected")
      }
    })

    this.signaling.on("group-peer-left", (event) => {
      this.cleanupPeer(event.peerId)
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

    const adapter = new GroupSignalingAdapter(this.signaling, targetPeerId)
    this.adapters.set(targetPeerId, adapter)

    const peer = new PeerConnection(
      adapter,
      role,
      {
        onState: (peerState) => {
          this.onPeerStateChange(targetPeerId, peerState)

          if (peerState === "connected") {
            // In a group, we do not show a toast for every individual connection
            // because it causes spam when connecting to a large mesh.
          } else if (peerState === "failed" || peerState === "closed") {
            console.warn(
              `[GroupWebRTC] Peer connection ${peerState} to ${targetPeerId}.`,
            )
            this.cleanupPeer(targetPeerId)
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
    pc.close()
    this.peers.delete(peerId)

    const adapter = this.adapters.get(peerId)
    if (adapter) {
      adapter.destroy()
      this.adapters.delete(peerId)
    }
    this.onMemberLeft(peerId)
  }

  private fail(err: unknown, phase?: string): void {
    const appErr = toAppError(err)
    if (phase) this.onPhaseChange(phase)
    this.onError(appErr.message)
    toast.error(appErr.message, appErr.hint)
  }

  public destroy(): void {
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
