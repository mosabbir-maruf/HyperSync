import type { SignalingClient } from "../signaling"
import type { PeerSignal, Role, Unsubscribe } from "../signaling"
import { RTC_CONFIG } from "./iceConfig"
import { LOW_WATER_MARK } from "../transfer/protocol"
import { WebRTCStatsCollector } from "./WebRTCStats"

export type PeerConnectionState = "new" | "negotiating" | "connected" | "disconnected" | "failed" | "closed"

export interface PeerConnectionEvents {
  onState?: (state: PeerConnectionState) => void
  onDataChannel?: (channel: RTCDataChannel) => void
  onMessageChannel?: (channel: RTCDataChannel) => void
  onError?: (message: string) => void
}

const CHANNEL_LABEL = "localshare"
const MSG_CHANNEL_LABEL = "localshare-msg"

/**
 * Wraps a single RTCPeerConnection and drives WebRTC negotiation over a
 * {@link SignalingClient}. It depends only on the signaling interface, never a
 * concrete adapter. The host is the offerer and owns the data channel; the
 * guest answers and receives the channel via `ondatachannel`.
 *
 * This class contains no file logic — it only establishes the transport.
 */
export class PeerConnection {
  private pc: RTCPeerConnection
  private unsubscribers: Unsubscribe[] = []
  private makingOffer = false
  private closed = false
  private pendingIce: RTCIceCandidateInit[] = []
  private signalQueue: Promise<void> = Promise.resolve()
  private negotiationTimeout: ReturnType<typeof setTimeout> | null = null
  private iceRestartAttempted = false
  public readonly stats: WebRTCStatsCollector

  constructor(
    private readonly signaling: SignalingClient,
    private readonly role: Role,
    private readonly events: PeerConnectionEvents = {},
    private readonly peerId: string = "unknown",
  ) {
    this.pc = new RTCPeerConnection(RTC_CONFIG)
    this.stats = new WebRTCStatsCollector(this.pc, this.peerId)
    this.wirePeerConnection()
    this.wireSignaling()
  }

  private setState(state: PeerConnectionState): void {
    if (state === "negotiating") {
      this.clearNegotiationTimeout()
      this.negotiationTimeout = setTimeout(() => {
        console.warn(
          "[GroupWebRTC] Negotiation timed out, forcing failure handling",
        )
        this.handleFailure()
      }, 30000) // Increased to 30s for slow mobile networks
    } else if (
      state === "connected" ||
      state === "failed" ||
      state === "closed"
    ) {
      this.clearNegotiationTimeout()
      if (state === "connected") {
        this.stats.start()
      } else {
        this.stats.stop()
      }
    }
    this.events.onState?.(state)
  }

  private handleFailure(): void {
    if (!this.iceRestartAttempted && this.role === "host") {
      this.iceRestartAttempted = true
      void this.makeOffer(true)
    } else {
      this.setState("failed")
      this.events.onError?.(
        "Connection failed. Please try rejoining the group.",
      )
    }
  }

  private clearNegotiationTimeout(): void {
    if (this.negotiationTimeout) {
      clearTimeout(this.negotiationTimeout)
      this.negotiationTimeout = null
    }
  }

  private wirePeerConnection(): void {
    const pc = this.pc

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        this.signaling.send({ kind: "ice", candidate: ev.candidate.toJSON() })
      } else {
      }
    }

    pc.onicegatheringstatechange = () => {}

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed" && !this.iceRestartAttempted) {
        this.iceRestartAttempted = true
        if (typeof pc.restartIce === "function") {
          pc.restartIce()
        }
        if (this.role === "host") {
          void this.makeOffer(true)
        }
      } else if (pc.iceConnectionState === "failed") {
        console.error(`[WebRTC] ICE FAILED — no usable candidate pair found`)
        this.handleFailure()
      }
    }

    pc.onconnectionstatechange = () => {
      switch (pc.connectionState) {
        case "connected":
          this.stats.start()
          this.setState("connected")
          break
        case "disconnected":
          this.stats.stop()
          this.setState("disconnected")
          break
        case "failed":
          this.handleFailure()
          break
        case "closed":
          this.stats.stop()
          this.setState("closed")
          break
      }
    }

    if (this.role === "host") {
      // Host owns the ordered, reliable file data channel.
      const channel = pc.createDataChannel(CHANNEL_LABEL, { ordered: true })
      channel.binaryType = "arraybuffer"
      channel.bufferedAmountLowThreshold = LOW_WATER_MARK
      this.events.onDataChannel?.(channel)

      // Host also creates the dedicated messaging channel (text-only).
      const msgChannel = pc.createDataChannel(MSG_CHANNEL_LABEL, {
        ordered: true,
      })
      this.events.onMessageChannel?.(msgChannel)
    } else {
      pc.ondatachannel = (ev) => {
        const ch = ev.channel
        if (ch.label === MSG_CHANNEL_LABEL) {
          // Messaging channel — deliver to messaging subsystem.
          this.events.onMessageChannel?.(ch)
        } else if (ch.label === CHANNEL_LABEL) {
          // File transfer channel — deliver to transfer engine.
          ch.binaryType = "arraybuffer"
          ch.bufferedAmountLowThreshold = LOW_WATER_MARK
          this.events.onDataChannel?.(ch)
        } else {
          console.warn("[WebRTC] Ignored unknown data channel:", ch.label)
        }
      }
    }
  }

  private wireSignaling(): void {
    let hasMadeInitialOffer = false
    this.unsubscribers.push(
      this.signaling.on("peer-joined", () => {
        // Host initiates negotiation once the guest is present.
        if (this.role === "host" && !hasMadeInitialOffer) {
          hasMadeInitialOffer = true
          void this.makeOffer()
        }
      }),
      this.signaling.on("signal", ({ signal }) => {
        this.signalQueue = this.signalQueue
          .then(() => this.handleSignal(signal))
          .catch((err) => console.error("Signal processing error:", err))
      }),
      this.signaling.on("peer-left", () => {
        this.setState("disconnected")
      }),
    )
  }

  private async makeOffer(iceRestart: boolean = false): Promise<void> {
    try {
      this.makingOffer = true
      this.setState("negotiating")
      const offer = await this.pc.createOffer({ iceRestart })
      await this.pc.setLocalDescription(offer)
      this.signaling.send({
        kind: "offer",
        sdp: this.pc.localDescription!.toJSON(),
      })
    } catch (err) {
      this.events.onError?.(errMessage(err))
    } finally {
      this.makingOffer = false
    }
  }

  private async handleSignal(signal: PeerSignal): Promise<void> {
    try {
      if (signal.kind === "offer") {
        if (this.pc.signalingState !== "stable") {
          return
        }
        this.setState("negotiating")
        await this.pc.setRemoteDescription(signal.sdp)
        const answer = await this.pc.createAnswer()
        await this.pc.setLocalDescription(answer)
        this.signaling.send({
          kind: "answer",
          sdp: this.pc.localDescription!.toJSON(),
        })
        await this.flushPendingIce()
      } else if (signal.kind === "answer") {
        if (this.pc.signalingState !== "have-local-offer") {
          return
        }
        await this.pc.setRemoteDescription(signal.sdp)
        await this.flushPendingIce()
      } else if (signal.kind === "ice") {
        if (!this.pc.remoteDescription) {
          this.pendingIce.push(signal.candidate)
        } else {
          try {
            await this.pc.addIceCandidate(signal.candidate)
          } catch (err) {}
        }
      }
    } catch (err) {
      this.events.onError?.(errMessage(err))
    }
  }

  private async flushPendingIce() {
    for (const candidate of this.pendingIce) {
      try {
        await this.pc.addIceCandidate(candidate)
      } catch (err) {}
    }
    this.pendingIce = []
  }

  get connectionState(): RTCPeerConnectionState {
    return this.pc.connectionState
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    this.stats.stop()
    for (const unsub of this.unsubscribers) unsub()
    this.unsubscribers = []
    try {
      this.pc.onicecandidate = null
      this.pc.onconnectionstatechange = null
      this.pc.ondatachannel = null
      this.pc.close()
    } catch {
      /* already closed */
    }
    this.setState("closed")
  }
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : "WebRTC error"
}
