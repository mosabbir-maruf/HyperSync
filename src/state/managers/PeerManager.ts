import { createSignalingClient } from "../../lib/signaling"
import type { SessionInfo } from "../../lib/signaling"
import {
  PeerConnection,
  type PeerConnectionState,
} from "../../lib/webrtc/PeerConnection"
import { toast } from "../../lib/notify/toast"
import { appError, toAppError } from "../../lib/errors"

export class PeerManager {
  private signaling = createSignalingClient()
  private peer: PeerConnection | null = null

  private _hostingInProgress = false
  private _joiningInProgress = false

  private onPhaseChange: (phase: any) => void = () => { }
  private onPeerStateChange: (state: PeerConnectionState) => void = () => { }
  private onDataChannel: (channel: RTCDataChannel) => void = () => { }
  private onMessageChannel: (channel: RTCDataChannel) => void = () => { }
  private onError: (error: string) => void = () => { }

  public getSignalingInfo(): SessionInfo | null {
    return null // Could hold info here if needed by UI
  }

  public getPeer(): PeerConnection | null {
    return this.peer
  }

  public setCallbacks(cbs: {
    onPhaseChange: (phase: any) => void
    onPeerStateChange: (state: PeerConnectionState) => void
    onDataChannel: (channel: RTCDataChannel) => void
    onMessageChannel: (channel: RTCDataChannel) => void
    onError: (error: string) => void
  }) {
    this.onPhaseChange = cbs.onPhaseChange
    this.onPeerStateChange = cbs.onPeerStateChange
    this.onDataChannel = cbs.onDataChannel
    this.onMessageChannel = cbs.onMessageChannel
    this.onError = cbs.onError
  }

  public async host(): Promise<SessionInfo | null> {
    if (this._hostingInProgress) return null
    this._hostingInProgress = true
    this.onPhaseChange("starting")

    try {
      // Attach the PeerConnection BEFORE creating the session so that signal
      this.attachPeer("host")
      const info = await this.signaling.createSession()
      this.onPhaseChange("waiting")
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
      // Attach the PeerConnection BEFORE joining so that signal
      // handlers (offer/answer/ice) are already subscribed when the
      // server relays the host's OFFER.  Without this, any signal
      // that arrives between joinSession() resolving and attachPeer()
      // would be emitted with no listener and permanently lost.
      this.attachPeer("guest")
      const info = await this.signaling.joinSession(code)
      this.onPhaseChange("connecting")
      return info
    } catch (err) {
      this.fail(err, "error")
      return null
    } finally {
      this._joiningInProgress = false
    }
  }

  private attachPeer(role: "host" | "guest"): void {
    this.signaling.on("peer-joined", () => {
      this.onPhaseChange("connecting")
    })

    this.signaling.on("peer-left", () => {
      this.onPhaseChange("disconnected")
      toast.warning("The other device left.")
    })

    this.signaling.on("error", (e) => {
      if (e.message.includes("disconnected temporarily")) {
        // ignore error
        this.onError(e.message)
        return
      }
      this.fail(appError("network", e.message))
    })

    this.peer = new PeerConnection(this.signaling, role, {
      onState: (peerState) => {
        this.onPeerStateChange(peerState)

        if (peerState === "connected") {
          toast.success("Connected", "Devices are now linked directly.")
        } else if (peerState === "failed") {
          this.fail(appError("network", "Connection failed"), "error")
        }
      },
      onDataChannel: (channel) => this.onDataChannel(channel),
      onMessageChannel: (channel) => this.onMessageChannel(channel),
      onError: (msg) => this.fail(appError("network", msg)),
    }, undefined)
  }

  private fail(err: unknown, phase?: string): void {
    if (err instanceof Error && err.name === "AbortError") return
    const appErr = toAppError(err)
    if (phase) this.onPhaseChange(phase)
    this.onError(appErr.message)
    toast.error(appErr.message, appErr.hint)
  }

  public destroy(): void {
    this._hostingInProgress = false
    this._joiningInProgress = false
    this.peer?.close()
    this.peer = null
    this.signaling.close()
    this.signaling = createSignalingClient()
  }
}
