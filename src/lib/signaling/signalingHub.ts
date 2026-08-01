import type { DevicePresence, PeerSignal } from "./types"

/**
 * DEV-ONLY in-memory signaling broker with BroadcastChannel support for multi-tab testing.
 */

const MAX_PEERS_PER_SESSION = 8
const SESSION_TTL_MS = 10 * 60 * 1000

interface HubPeer {
  peerId: string
  role: "host" | "guest" | "member"
  onSignal: (from: string, signal: PeerSignal) => void
  onPeerJoined: (peerId: string, role: "host" | "guest" | "member") => void
  onPeerLeft: (peerId: string) => void
}

interface HubSession {
  sessionId: string
  code: string
  peers: Map<string, HubPeer> // Local peers only
  globalPeers: Map<string, { role: "host" | "guest" | "member" }> // All peers in all tabs
  expiresAt: number
  maxMembers: number
}

interface LobbyMember {
  presence: DevicePresence
  onRoster: (devices: DevicePresence[]) => void
  onInvite: (from: string, fromName: string, code: string) => void
}

class SignalingHub {
  private sessions = new Map<string, HubSession>()
  private lobby = new Map<string, LobbyMember>()
  private channel = new BroadcastChannel("dropsync_signaling")

  constructor() {
    this.channel.onmessage = (event) => {
      const msg = event.data
      if (msg.type === "LOBBY_SYNC") {
        for (const device of msg.devices) {
          // Temporarily store external devices for this broadcast tick
        }
        this.broadcastRoster(msg.devices)
      } else if (msg.type === "LOBBY_INVITE") {
        const target = this.lobby.get(msg.targetId)
        if (target) target.onInvite(msg.fromId, msg.fromName, msg.code)
      } else if (msg.type === "SESSION_CREATED") {
        if (!this.sessions.has(msg.code)) {
          this.sessions.set(msg.code, {
            sessionId: msg.sessionId,
            code: msg.code,
            peers: new Map(),
            globalPeers: new Map(),
            expiresAt: Date.now() + SESSION_TTL_MS,
            maxMembers: msg.maxMembers,
          })
        }
      } else if (msg.type === "PEER_JOINED") {
        const session = this.sessions.get(msg.code)
        if (session) {
          session.globalPeers.set(msg.peerId, { role: msg.role })
          for (const localPeer of session.peers.values()) {
            if (localPeer.peerId !== msg.peerId) {
              localPeer.onPeerJoined(msg.peerId, msg.role)
            }
          }
        }
      } else if (msg.type === "PEER_LEFT") {
        const session = this.sessions.get(msg.code)
        if (session) {
          session.globalPeers.delete(msg.peerId)
          for (const localPeer of session.peers.values()) {
            localPeer.onPeerLeft(msg.peerId)
          }
        }
      } else if (msg.type === "SIGNAL") {
        const session = this.sessions.get(msg.code)
        if (session) {
          if (msg.targetPeerId) {
            const target = session.peers.get(msg.targetPeerId)
            if (target) target.onSignal(msg.from, msg.signal)
          } else {
            for (const peer of session.peers.values()) {
              if (peer.peerId !== msg.from) peer.onSignal(msg.from, msg.signal)
            }
          }
        }
      } else if (msg.type === "ROSTER_REQUEST") {
        if (this.lobby.size > 0) {
          this.channel.postMessage({
            type: "LOBBY_SYNC",
            devices: [...this.lobby.values()].map((m) => m.presence),
          })
        }
      }
    }

    // Request roster and sessions when loaded
    this.channel.postMessage({ type: "ROSTER_REQUEST" })
  }

  announceLobby(member: LobbyMember): void {
    this.lobby.set(member.presence.peerId, member)
    this.channel.postMessage({
      type: "LOBBY_SYNC",
      devices: [...this.lobby.values()].map((m) => m.presence),
    })
    this.broadcastRoster()
  }

  leaveLobby(peerId: string): void {
    if (this.lobby.delete(peerId)) {
      this.channel.postMessage({
        type: "LOBBY_SYNC",
        devices: [...this.lobby.values()].map((m) => m.presence),
      })
      this.broadcastRoster()
    }
  }

  inviteLobby(fromId: string, targetId: string, code: string): void {
    const target = this.lobby.get(targetId)
    const fromName = this.lobby.get(fromId)?.presence.name ?? "A device"
    if (target) {
      target.onInvite(fromId, fromName, code)
    } else {
      this.channel.postMessage({
        type: "LOBBY_INVITE",
        targetId,
        fromId,
        fromName,
        code,
      })
    }
  }

  private broadcastRoster(externalDevices: DevicePresence[] = []): void {
    for (const member of this.lobby.values()) {
      const localOthers = [...this.lobby.values()]
        .filter((m) => m.presence.peerId !== member.presence.peerId)
        .map((m) => m.presence)
      const allOthers = [
        ...localOthers,
        ...externalDevices.filter(
          (d) =>
            d.peerId !== member.presence.peerId && !this.lobby.has(d.peerId),
        ),
      ]
      member.onRoster(allOthers)
    }
  }

  createSession(
    sessionId: string,
    code: string,
    maxMembers: number = MAX_PEERS_PER_SESSION,
  ): void {
    this.gc()
    this.sessions.set(code, {
      sessionId,
      code,
      peers: new Map(),
      globalPeers: new Map(),
      expiresAt: Date.now() + SESSION_TTL_MS,
      maxMembers,
    })
    this.channel.postMessage({
      type: "SESSION_CREATED",
      sessionId,
      code,
      maxMembers,
    })
  }

  hasSession(code: string): boolean {
    this.gc()
    return this.sessions.has(code)
  }

  join(code: string, peer: HubPeer): {
    peerId: string
    role: "host" | "guest" | "member"
  }[] {
    let session = this.sessions.get(code)
    if (!session) {
      // Allow joining if testing locally and it was created in another tab
      session = {
        sessionId: "mock-session",
        code,
        peers: new Map(),
        globalPeers: new Map(),
        expiresAt: Date.now() + SESSION_TTL_MS,
        maxMembers: MAX_PEERS_PER_SESSION,
      }
      this.sessions.set(code, session)
    }

    const existing = [...session.globalPeers.entries()].map(
      ([peerId, data]) => ({
        peerId,
        role: data.role,
      }),
    )

    session.peers.set(peer.peerId, peer)
    session.globalPeers.set(peer.peerId, { role: peer.role })

    for (const other of session.peers.values()) {
      if (other.peerId !== peer.peerId)
        other.onPeerJoined(peer.peerId, peer.role)
    }

    this.channel.postMessage({
      type: "PEER_JOINED",
      code,
      peerId: peer.peerId,
      role: peer.role,
    })
    return existing
  }

  relay(
    code: string,
    from: string,
    signal: PeerSignal,
    targetPeerId?: string,
  ): void {
    const session = this.sessions.get(code)
    if (!session) return

    if (targetPeerId) {
      const target = session.peers.get(targetPeerId)
      if (target) target.onSignal(from, signal)
    } else {
      for (const peer of session.peers.values()) {
        if (peer.peerId !== from) peer.onSignal(from, signal)
      }
    }
    this.channel.postMessage({
      type: "SIGNAL",
      code,
      from,
      signal,
      targetPeerId,
    })
  }

  leave(code: string, peerId: string): void {
    const session = this.sessions.get(code)
    if (!session) return
    session.peers.delete(peerId)
    session.globalPeers.delete(peerId)
    for (const peer of session.peers.values()) peer.onPeerLeft(peerId)

    this.channel.postMessage({ type: "PEER_LEFT", code, peerId })
    if (session.peers.size === 0 && session.globalPeers.size === 0)
      this.sessions.delete(code)
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

export const signalingHub = new SignalingHub()
