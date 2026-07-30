import type { DevicePresence, PeerSignal } from "./types"

/**
 * DEV-ONLY in-memory signaling broker.
 *
 * Models exactly what the future Cloudflare Durable Object does — a per-session
 * registry that relays negotiation signals between two peers and tracks their
 * lifecycle — but entirely within this JS runtime. It exists so the real WebRTC
 * + transfer stack can run end-to-end locally without a server.
 *
 * It is NOT a production transport: it does not cross tabs, origins, or devices.
 * The production build never touches this file (see signaling/index.ts factory).
 */

const MAX_PEERS_PER_SESSION = 2
const SESSION_TTL_MS = 10 * 60 * 1000

interface HubPeer {
  peerId: string
  onSignal: (from: string, signal: PeerSignal) => void
  onPeerJoined: (peerId: string) => void
  onPeerLeft: (peerId: string) => void
}

interface HubSession {
  sessionId: string
  code: string
  peers: Map<string, HubPeer>
  expiresAt: number
}

interface LobbyMember {
  presence: DevicePresence
  onRoster: (devices: DevicePresence[]) => void
  onInvite: (from: string, fromName: string, code: string) => void
}

class SignalingHub {
  private sessions = new Map<string, HubSession>() // keyed by code
  private lobby = new Map<string, LobbyMember>() // keyed by peerId

  // ---- discovery lobby (presence for "nearby devices") --------------------

  announceLobby(member: LobbyMember): void {
    this.lobby.set(member.presence.peerId, member)
    this.broadcastRoster()
  }

  leaveLobby(peerId: string): void {
    if (this.lobby.delete(peerId)) this.broadcastRoster()
  }

  inviteLobby(fromId: string, targetId: string, code: string): void {
    const target = this.lobby.get(targetId)
    if (!target) return
    const fromName = this.lobby.get(fromId)?.presence.name ?? "A device"
    target.onInvite(fromId, fromName, code)
  }

  private broadcastRoster(): void {
    for (const member of this.lobby.values()) {
      const others = [...this.lobby.values()]
        .filter((m) => m.presence.peerId !== member.presence.peerId)
        .map((m) => m.presence)
      member.onRoster(others)
    }
  }

  createSession(sessionId: string, code: string): void {
    this.gc()
    this.sessions.set(code, {
      sessionId,
      code,
      peers: new Map(),
      expiresAt: Date.now() + SESSION_TTL_MS,
    })
  }

  hasSession(code: string): boolean {
    this.gc()
    return this.sessions.has(code)
  }

  /** Register a peer. Returns the ids of peers already present. */
  join(code: string, peer: HubPeer): string[] {
    const session = this.sessions.get(code)
    if (!session) throw new Error("Session not found")
    if (session.peers.size >= MAX_PEERS_PER_SESSION) {
      throw new Error("Session is full")
    }
    const existing = [...session.peers.keys()]
    session.peers.set(peer.peerId, peer)
    // Notify existing peers that a new one joined.
    for (const other of session.peers.values()) {
      if (other.peerId !== peer.peerId) other.onPeerJoined(peer.peerId)
    }
    return existing
  }

  relay(code: string, from: string, signal: PeerSignal): void {
    const session = this.sessions.get(code)
    if (!session) return
    for (const peer of session.peers.values()) {
      if (peer.peerId !== from) peer.onSignal(from, signal)
    }
  }

  leave(code: string, peerId: string): void {
    const session = this.sessions.get(code)
    if (!session) return
    session.peers.delete(peerId)
    for (const peer of session.peers.values()) peer.onPeerLeft(peerId)
    if (session.peers.size === 0) this.sessions.delete(code)
  }

  private gc(): void {
    const now = Date.now()
    for (const [code, session] of this.sessions) {
      if (session.expiresAt < now && session.peers.size === 0) {
        this.sessions.delete(code)
      }
    }
  }
}

// Module singleton — one broker per runtime.
export const signalingHub = new SignalingHub()
