import type { SignalingClient } from "../signaling"
import type { PeerSignal, Role, Unsubscribe } from "../signaling"
import { RTC_CONFIG } from "./iceConfig"
import { LOW_WATER_MARK } from "../transfer/protocol"
import { WebRTCStatsCollector } from "./WebRTCStats"

export type PeerConnectionState = "new" | "negotiating" | "connected" | "disconnected" | "failed" | "closed"

export interface PeerConnectionEvents {
  onState?: (state: PeerConnectionState) => void
  onDataChannel?: (channel: RTCDataChannel) => void
  onError?: (message: string) => void
}

const CHANNEL_LABEL = "localshare"

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
  public readonly stats: WebRTCStatsCollector

  constructor(
    private readonly signaling: SignalingClient,
    private readonly role: Role,
    private readonly events: PeerConnectionEvents = {},
  ) {
    this.pc = new RTCPeerConnection(RTC_CONFIG)
    this.stats = new WebRTCStatsCollector(this.pc)
    this.wirePeerConnection()
    this.wireSignaling()
  }

  private setState(state: PeerConnectionState): void {
    this.events.onState?.(state)
  }

  private wirePeerConnection(): void {
    const pc = this.pc

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        console.log(`[WebRTC] Gathered ICE candidate: type=${ev.candidate.type} protocol=${ev.candidate.protocol} address=${ev.candidate.address}`)
        this.signaling.send({ kind: "ice", candidate: ev.candidate.toJSON() })
      } else {
        console.log(`[WebRTC] ICE gathering complete`)
      }
    }

    pc.onicegatheringstatechange = () => {
      console.log(`[WebRTC] iceGatheringState=${pc.iceGatheringState}`)
    }

    let iceRestartAttempted = false
    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] iceConnectionState=${pc.iceConnectionState}`)
      if (pc.iceConnectionState === "failed" && !iceRestartAttempted) {
        iceRestartAttempted = true
        console.warn(`[WebRTC] ICE failed. Attempting ICE restart...`)
        if (typeof pc.restartIce === "function") {
          pc.restartIce()
        }
        if (this.role === "host") {
          void this.makeOffer()
        }
      } else if (pc.iceConnectionState === "failed") {
        console.error(`[WebRTC] ICE FAILED — no usable candidate pair found`)
        this.events.onError?.("ICE connection failed — cannot establish direct link")
      }
    }

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] connectionState=${pc.connectionState} iceConnectionState=${pc.iceConnectionState}`)
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
          if (!iceRestartAttempted && this.role === "host") {
            iceRestartAttempted = true
            console.warn(`[WebRTC] Connection failed. Restarting ICE...`)
            void this.makeOffer()
          } else {
            this.setState("failed")
            this.events.onError?.("Connection failed")
          }
          break
        case "closed":
          this.stats.stop()
          this.setState("closed")
          break
      }
    }

    if (this.role === "host") {
      // Host owns the ordered, reliable data channel.
      const channel = pc.createDataChannel(CHANNEL_LABEL, { ordered: true })
      channel.binaryType = "arraybuffer"
      channel.bufferedAmountLowThreshold = LOW_WATER_MARK
      this.events.onDataChannel?.(channel)
    } else {
      pc.ondatachannel = (ev) => {
        ev.channel.binaryType = "arraybuffer"
        ev.channel.bufferedAmountLowThreshold = LOW_WATER_MARK
        this.events.onDataChannel?.(ev.channel)
      }
    }
  }

  private wireSignaling(): void {
    this.unsubscribers.push(
      this.signaling.on("peer-joined", () => {
        console.log(`[WebRTC] peer-joined received, role=${this.role}`)
        // Host initiates negotiation once the guest is present.
        if (this.role === "host") void this.makeOffer()
      }),
      this.signaling.on(
        "signal",
        ({ signal }) => void this.handleSignal(signal),
      ),
      this.signaling.on("peer-left", () => {
        this.setState("disconnected")
      }),
    )
  }

  private async makeOffer(): Promise<void> {
    console.log(`[WebRTC] Creating offer...`)
    try {
      this.makingOffer = true
      this.setState("negotiating")
      const offer = await this.pc.createOffer()
      await this.pc.setLocalDescription(offer)
      this.signaling.send({
        kind: "offer",
        sdp: this.pc.localDescription!.toJSON(),
      })
      console.log(`[WebRTC] Offer sent`)
    } catch (err) {
      this.events.onError?.(errMessage(err))
    } finally {
      this.makingOffer = false
    }
  }

  private async handleSignal(signal: PeerSignal): Promise<void> {
    console.log(`[WebRTC] handleSignal kind=${signal.kind}`)
    try {
      if (signal.kind === "offer") {
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
        await this.pc.setRemoteDescription(signal.sdp)
        await this.flushPendingIce()
      } else if (signal.kind === "ice") {
        if (!this.pc.remoteDescription) {
          this.pendingIce.push(signal.candidate)
        } else {
          try {
            await this.pc.addIceCandidate(signal.candidate)
          } catch (err) {
            console.warn("Failed to add ICE candidate", err)
          }
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
      } catch (err) {
        console.warn("Failed to add queued ICE candidate", err)
      }
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
