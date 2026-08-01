import type { SignalingClient } from "./SignalingClient"
import { SignalingEmitter } from "./SignalingClient"
import { signalingHub } from "./signalingHub"
import { generatePairingCode, normalizeCode, randomId } from "../utils"
import { isPeerSignal } from "./types"
import type {
  DevicePresence,
  PeerSignal,
  Role,
  SessionInfo,
  SignalingConnectionState,
} from "./types"

/**
 * DEV-ONLY adapter over the in-memory {@link signalingHub}.
 * Implements the same SignalingClient contract as the production transport,
 * so it is a drop-in replacement for the future Cloudflare adapter.
 */
export class InMemorySignalingClient
  extends SignalingEmitter
  implements SignalingClient
{
  state: SignalingConnectionState = "idle"

  private readonly peerId = randomId()
  private code: string | null = null
  private role: Role | null = null

  private setState(state: SignalingConnectionState): void {
    this.state = state
    this.emit({ type: "state", state })
  }

  private buildInfo(sessionId: string, code: string, role: Role): SessionInfo {
    const url = new URL(window.location.href)
    url.hash = ""
    url.search = `?code=${encodeURIComponent(code)}`
    return { sessionId, code, role, joinUrl: url.toString() }
  }

  async createSession(): Promise<SessionInfo> {
    this.setState("connecting")
    const sessionId = randomId()
    const code = generatePairingCode()
    this.role = "host"
    signalingHub.createSession(sessionId, code, 2)
    this.code = code
    this.attach(code, "host", false)
    this.setState("connected")
    return this.buildInfo(sessionId, code, "host")
  }

  async joinSession(
    code: string,
    _role: "host" | "guest" = "guest",
  ): Promise<SessionInfo> {
    this.setState("connecting")
    const normalizedCode = normalizeCode(code)
    if (!signalingHub.hasSession(normalizedCode)) {
      this.setState("error")
      throw new Error("No active session for that code")
    }
    this.code = normalizedCode
    this.role = "guest"
    const existing = this.attach(normalizedCode, "guest", false)
    this.setState("connected")
    // Surface already-present peers so negotiation can begin immediately.
    for (const p of existing)
      this.emit({ type: "peer-joined", peerId: p.peerId })
    return this.buildInfo(normalizedCode, normalizedCode, "guest")
  }

  async createGroup(maxMembers?: number): Promise<SessionInfo> {
    this.setState("connecting")
    const sessionId = randomId()
    const code = generatePairingCode()
    this.role = "host"
    signalingHub.createSession(sessionId, code, maxMembers ?? 8)
    this.code = code
    this.attach(code, "host", true)
    this.setState("connected")
    return this.buildInfo(sessionId, code, "host")
  }

  async joinGroup(code: string): Promise<SessionInfo> {
    this.setState("connecting")
    const normalizedCode = normalizeCode(code)
    if (!signalingHub.hasSession(normalizedCode)) {
      this.setState("error")
      throw new Error("No active group session for that code")
    }
    this.code = normalizedCode
    this.role = "member"
    const existing = this.attach(normalizedCode, "member", true)
    this.setState("connected")
    // For groups, emit group-peer-joined
    for (const p of existing)
      this.emit({ type: "group-peer-joined", peerId: p.peerId, role: p.role })
    return this.buildInfo(normalizedCode, normalizedCode, "member")
  }

  private attach(code: string, role: Role, isGroup: boolean): {
    peerId: string
    role: Role
  }[] {
    return signalingHub.join(code, {
      peerId: this.peerId,
      role: role,
      onSignal: (from, signal) => {
        if (!isPeerSignal(signal)) {
          this.emit({ type: "error", message: "Rejected malformed signal" })
          return
        }
        if (isGroup) {
          this.emit({ type: "group-signal", from, signal })
        } else {
          this.emit({ type: "signal", from, signal })
        }
      },
      onPeerJoined: (peerId, role) => {
        if (isGroup) {
          this.emit({ type: "group-peer-joined", peerId, role })
        } else {
          this.emit({ type: "peer-joined", peerId })
        }
      },
      onPeerLeft: (peerId) => {
        if (isGroup) {
          this.emit({ type: "group-peer-left", peerId })
        } else {
          this.emit({ type: "peer-left", peerId })
        }
      },
    })
  }

  send(signal: PeerSignal): void {
    if (!this.code) return
    signalingHub.relay(this.code, this.peerId, signal)
  }

  sendGroupSignal(targetPeerId: string, signal: PeerSignal): void {
    if (!this.code) return
    signalingHub.relay(this.code, this.peerId, signal, targetPeerId)
  }

  private inLobby = false

  announce(profile: Omit<DevicePresence, "peerId">): void {
    this.inLobby = true
    signalingHub.announceLobby({
      presence: { ...profile, peerId: this.peerId },
      onRoster: (devices) => this.emit({ type: "roster", devices }),
      onInvite: (from, fromName, code) =>
        this.emit({ type: "invite", from, fromName, code }),
    })
  }

  invite(targetPeerId: string, code: string): void {
    signalingHub.inviteLobby(this.peerId, targetPeerId, code)
  }

  close(): void {
    if (this.inLobby) {
      signalingHub.leaveLobby(this.peerId)
      this.inLobby = false
    }
    if (this.code) signalingHub.leave(this.code, this.peerId)
    this.code = null
    this.setState("closed")
    this.clearListeners()
  }
}
