import type { SignalingClient } from "./SignalingClient"
import { SignalingEmitter } from "./SignalingClient"
import { randomId, normalizeCode } from "../utils"
import type {
  DevicePresence,
  PeerSignal,
  SessionInfo,
  SignalingConnectionState,
} from "./types"

export class WebSocketSignalingClient extends SignalingEmitter implements SignalingClient {
  state: SignalingConnectionState = "idle"

  private ws: WebSocket | null = null
  private readonly peerId = randomId()
  private sessionId: string | null = null
  private code: string | null = null
  private role: "host" | "guest" | null = null
  private pingInterval: number | null = null
  private hasPeerJoined = false
  private joinedPeerId = "remote"

  constructor(private readonly url: string) {
    super()
  }

  override on<T extends import("./types").SignalingEventType>(
    type: T,
    handler: import("./types").SignalingEventHandler<T>
  ): import("./types").Unsubscribe {
    const unsub = super.on(type, handler)
    if (type === "peer-joined" && this.hasPeerJoined) {
      setTimeout(() => {
        try {
          (handler as any)({ type: "peer-joined", peerId: this.joinedPeerId })
        } catch (e) {
          console.warn("Error replaying peer-joined handler", e)
        }
      }, 0)
    }
    return unsub
  }

  private setState(state: SignalingConnectionState) {
    this.state = state
    this.emit({ type: "state", state })
  }

  private buildInfo(sessionId: string, code: string, role: "host" | "guest"): SessionInfo {
    const url = new URL(window.location.href)
    url.hash = ""
    url.search = `?code=${encodeURIComponent(code)}`
    return { sessionId, code, role, joinUrl: url.toString() }
  }

  private async connectWebSocket(code: string, role: "host" | "guest"): Promise<void> {
    return new Promise((resolve, reject) => {
      // Connect to the room by its URL
      const wsUrl = new URL(this.url)
      wsUrl.pathname = "/ws"
      wsUrl.searchParams.set("code", code)
      wsUrl.protocol = wsUrl.protocol === "http:" ? "ws:" : "wss:"

      const ws = new WebSocket(wsUrl.toString())
      this.ws = ws

      ws.onopen = () => {
        console.log(`[Signaling] WebSocket open, role=${role}, sending JOIN`)
        // Send JOIN message
        this.sendMessage("JOIN", { role })
        
        // Start heartbeat
        this.pingInterval = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            this.sendMessage("PING", {})
          }
        }, 15000)
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          console.log(`[Signaling] ← ${msg.type}`, msg.payload)
          this.handleMessage(msg, resolve, reject)
        } catch (err) {
          console.error("Failed to parse websocket message", err)
        }
      }

      ws.onerror = () => {
        if (this.state === "connecting") {
          reject(new Error("WebSocket connection failed"))
        }
        this.emit({ type: "error", message: "WebSocket connection error" })
      }

      ws.onclose = (ev) => {
        console.log(`[Signaling] WebSocket closed code=${ev.code} reason=${ev.reason}`)
        this.cleanup()
        if (ev.code === 4004 || ev.code === 4003) {
           this.emit({ type: "error", message: "Session expired or full" })
        }
        this.emit({ type: "peer-left", peerId: "remote" })
        if (this.state === "connecting") {
          reject(new Error("WebSocket closed unexpectedly"))
        }
        this.setState("closed")
      }
    })
  }

  private handleMessage(msg: any, resolve: (val?: any) => void, reject: (err: Error) => void) {
    switch (msg.type) {
      case "HELLO":
        // Our own join succeeded
        if (this.state === "connecting") {
          this.setState("connected")
          resolve()
        }
        break
      case "READY":
        // Both peers are present. Only the HOST should initiate negotiation.
        if (this.state === "connecting") {
          this.setState("connected")
          resolve()
        }
        // Only emit peer-joined if WE are the host AND a guest just joined,
        // OR if we are the guest AND the host is already there (server will tell us).
        // The payload.joinedRole tells us who just joined.
        // The payload.yourRole tells us our own role.
        // Only the HOST makes the offer, so only HOST needs peer-joined.
        {
          const joinedRole = msg.payload?.joinedRole as string | undefined
          const yourRole = msg.payload?.yourRole as string | undefined
          const joinedPeerId = msg.payload?.joinedPeerId || "remote"
          console.log(`[Signaling] READY payload: joinedRole=${joinedRole} yourRole=${yourRole} this.role=${this.role}`)
          // If the server sends READY and a GUEST just joined, notify the HOST to start negotiation
          if (joinedRole === "GUEST" && (yourRole === "HOST" || this.role === "host")) {
            this.hasPeerJoined = true
            this.joinedPeerId = joinedPeerId
            console.log(`[Signaling] Emitting peer-joined (we are host, guest joined)`)
            this.emit({ type: "peer-joined", peerId: joinedPeerId })
          }
          // If no payload (fallback for old server), emit for host only
          if (!joinedRole && this.role === "host") {
            this.hasPeerJoined = true
            this.joinedPeerId = "remote"
            console.log(`[Signaling] Emitting peer-joined (fallback, no payload)`)
            this.emit({ type: "peer-joined", peerId: "remote" })
          }
        }
        break
      case "OFFER":
        this.emit({ type: "signal", from: msg.peerId, signal: { kind: "offer", sdp: msg.payload.offer } })
        break
      case "ANSWER":
        this.emit({ type: "signal", from: msg.peerId, signal: { kind: "answer", sdp: msg.payload.answer } })
        break
      case "ICE":
        this.emit({ type: "signal", from: msg.peerId, signal: { kind: "ice", candidate: msg.payload.candidate } })
        break
      case "ERROR":
      case "SESSION_FULL":
      case "SESSION_EXPIRED":
        if (this.state === "connecting") {
          reject(new Error(msg.payload?.message || msg.type))
        } else {
          this.emit({ type: "error", message: msg.payload?.message || msg.type })
        }
        break
      case "PONG":
        break
    }
  }

  private sendMessage(type: string, payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type,
        protocolVersion: 1,
        sessionId: this.sessionId,
        peerId: this.peerId,
        timestamp: Date.now(),
        payload
      }))
    }
  }

  async createSession(): Promise<SessionInfo> {
    this.setState("connecting")
    try {
      // Step 1: Create session via HTTP API
      const res = await fetch(`${this.url}/session`, {
        method: "POST"
      })
      if (!res.ok) throw new Error("Failed to create session")
      
      const data = await res.json()
      if (!data.success) throw new Error(data.error?.message || "Unknown error")
      
      const code = data.data.sessionCode
      const roomId = data.data.sessionId || data.data.id
      
      this.code = code
      this.sessionId = roomId
      this.role = "host"

      // Step 2: Connect WebSocket
      await this.connectWebSocket(code, "host")

      return this.buildInfo(roomId, code, "host")
    } catch (err) {
      this.setState("error")
      throw err
    }
  }

  async joinSession(code: string): Promise<SessionInfo> {
    this.setState("connecting")
    const normalizedCode = normalizeCode(code)
    try {
      // Step 1: Join session via HTTP API
      const res = await fetch(`${this.url}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionCode: normalizedCode })
      })
      if (!res.ok) throw new Error("Failed to join session")
      
      const data = await res.json()
      if (!data.success) throw new Error(data.error?.message || "Unknown error")
      
      const roomId = data.data.sessionId || data.data.id
      
      this.code = normalizedCode
      this.sessionId = roomId
      this.role = "guest"

      // Step 2: Connect WebSocket
      await this.connectWebSocket(normalizedCode, "guest")

      return this.buildInfo(roomId, normalizedCode, "guest")
    } catch (err) {
      this.setState("error")
      throw err
    }
  }

  send(signal: PeerSignal): void {
    if (signal.kind === "offer") {
      this.sendMessage("OFFER", { offer: signal.sdp })
    } else if (signal.kind === "answer") {
      this.sendMessage("ANSWER", { answer: signal.sdp })
    } else if (signal.kind === "ice") {
      this.sendMessage("ICE", { candidate: signal.candidate })
    }
  }

  // Lobby is not implemented on the worker backend (it's specifically for session transfer)
  announce(profile: Omit<DevicePresence, "peerId">): void {
    // No-op for real backend currently
  }
  invite(targetPeerId: string, code: string): void {
    // No-op for real backend currently
  }

  close(): void {
    this.sendMessage("LEAVE", {})
    if (this.ws) {
      this.ws.close(1000, "Normal closure")
    }
    this.cleanup()
    this.setState("closed")
    this.clearListeners()
  }

  private cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
    this.ws = null
    this.code = null
    this.sessionId = null
    this.role = null
    this.hasPeerJoined = false
    this.joinedPeerId = "remote"
  }
}
