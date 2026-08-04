import type { SignalingClient } from "./SignalingClient"
import { SignalingEmitter } from "./SignalingClient"
import { randomId, normalizeCode } from "../utils"
import type {
  DevicePresence,
  PeerSignal,
  SessionInfo,
  SignalingConnectionState,
} from "./types"

export class WebSocketSignalingClient
  extends SignalingEmitter
  implements SignalingClient
{
  state: SignalingConnectionState = "idle"

  private ws: WebSocket | null = null
  private readonly peerId = randomId()
  private sessionId: string | null = null
  private code: string | null = null
  private role: "host" | "guest" | "member" | null = null
  private pingInterval: number | null = null
  private hasPeerJoined = false
  private joinedPeerId = "remote"
  private roomType: "direct" | "group" = "direct"

  // Lobby connection
  private lobbyWs: WebSocket | null = null
  private lobbyPingInterval: number | null = null
  private lobbyReconnectTimeout: number | null = null
  private lobbyReconnectAttempts = 0
  private lobbyProfile: Omit<DevicePresence, "peerId"> | null = null
  private shouldKeepLobbyConnected = false

  private abortController: AbortController | null = null
  private connectionAttempt = 0

  private readonly httpUrl: string

  constructor(private readonly url: string) {
    super()
    const parsed = new URL(url)
    // If it's a websocket URL, convert it to HTTP for REST calls. If it's already HTTP/HTTPS, leave it (or force it correctly).
    if (parsed.protocol === "wss:" || parsed.protocol === "https:") {
      parsed.protocol = "https:"
    } else {
      parsed.protocol = "http:"
    }
    this.httpUrl = parsed.toString().replace(/\/$/, "")
  }

  on<T extends import("./types").SignalingEventType,>(
    type: T,
    handler: import("./types").SignalingEventHandler<T>,
  ): import("./types").Unsubscribe {
    const unsub = super.on(type, handler)
    if (type === "peer-joined" && this.hasPeerJoined) {
      setTimeout(() => {
        try {
          const emitPeerJoined = handler as (event: {
            type: "peer-joined"
            peerId: string | null
          }) => void
          emitPeerJoined({ type: "peer-joined", peerId: this.joinedPeerId })
        } catch (e) {
                  }
      }, 0)
    }
    return unsub
  }

  private setState(state: SignalingConnectionState) {
    this.state = state
    this.emit({ type: "state", state })
  }

  private buildInfo(
    sessionId: string,
    code: string,
    role: "host" | "guest" | "member",
    isGroup: boolean = false,
  ): SessionInfo {
    const url = new URL(window.location.href)
    url.hash = ""
    if (isGroup) {
      url.pathname = "/group"
    } else {
      url.pathname = "/join"
    }
    url.search = `?code=${encodeURIComponent(code)}`
    return { sessionId, code, role, joinUrl: url.toString() }
  }

  private async connectWebSocket(
    code: string,
    role: "host" | "guest" | "member",
    roomType: "direct" | "group" = "direct",
    attempt: number,
  ): Promise<void> {
    this.roomType = roomType
    return new Promise((resolve, reject) => {
      // Connect to the room by its URL
      const wsUrl = new URL(this.url)
      const basePath = wsUrl.pathname === "/" ? "" : wsUrl.pathname
      wsUrl.pathname = basePath + (roomType === "group" ? "/group/ws" : "/ws")
      wsUrl.searchParams.set("code", code)
      wsUrl.protocol = wsUrl.protocol === "http:" ? "ws:" : "wss:"

      const ws = new WebSocket(wsUrl.toString())
      this.ws = ws

      ws.onopen = () => {
        if (this.connectionAttempt !== attempt) {
          ws.close(1000, "Stale connection")
          return
        }
                // Send JOIN message
        this.sendMessage(roomType === "group" ? "GROUP_JOIN" : "JOIN", { role })

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

  private handleMessage(
    msg: any,
    resolve: (val?: any) => void,
    reject: (err: Error) => void,
  ) {
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
                    // If the server sends READY and a GUEST just joined, notify the HOST to start negotiation
          if (
            joinedRole === "GUEST" &&
            (yourRole === "HOST" || this.role === "host")
          ) {
            this.hasPeerJoined = true
            this.joinedPeerId = joinedPeerId
                        this.emit({ type: "peer-joined", peerId: joinedPeerId })
          }
          // If no payload (fallback for old server), emit for host only
          if (!joinedRole && this.role === "host") {
            this.hasPeerJoined = true
            this.joinedPeerId = "remote"
                        this.emit({ type: "peer-joined", peerId: "remote" })
          }
        }
        break
      case "OFFER":
        this.emit({
          type: "signal",
          from: msg.peerId,
          signal: { kind: "offer", sdp: msg.payload.offer },
        })
        break
      case "ANSWER":
        this.emit({
          type: "signal",
          from: msg.peerId,
          signal: { kind: "answer", sdp: msg.payload.answer },
        })
        break
      case "ICE":
        this.emit({
          type: "signal",
          from: msg.peerId,
          signal: { kind: "ice", candidate: msg.payload.candidate },
        })
        break
      case "GROUP_MEMBER_JOINED":
        this.emit({
          type: "group-peer-joined",
          peerId: msg.payload.peerId,
          role: msg.payload.role,
        })
        break
      case "GROUP_MEMBER_LEFT":
        this.emit({
          type: "group-peer-left",
          peerId: msg.payload.peerId,
        })
        break
      case "GROUP_SIGNAL":
        if (msg.payload.targetPeerId && msg.payload.targetPeerId !== this.peerId) {
          break
        }
        this.emit({
          type: "group-signal",
          from: msg.peerId,
          signal: msg.payload.signal,
        })
        break
      case "ERROR":
      case "SESSION_FULL":
      case "SESSION_EXPIRED":
        if (this.state === "connecting") {
          reject(new Error(msg.payload?.message || msg.type))
        } else {
          this.emit({
            type: "error",
            message: msg.payload?.message || msg.type,
          })
        }
        break
      case "PONG":
        break
    }
  }

  private sendMessage(type: string, payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type,
          protocolVersion: 1,
          sessionId: this.sessionId,
          peerId: this.peerId,
          timestamp: Date.now(),
          payload,
        }),
      )
    }
  }

  async createSession(): Promise<SessionInfo> {
    this.setState("connecting")
    const attempt = ++this.connectionAttempt

    this.abortController?.abort()
    this.abortController = new AbortController()

    try {
      // Step 1: Create session via HTTP API
      const res = await fetch(`${this.httpUrl}/session`, {
        method: "POST",
        signal: this.abortController.signal,
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
      await this.connectWebSocket(code, "host", "direct", attempt)

      return this.buildInfo(roomId, code, "host")
    } catch (err: any) {
      if (err.name !== "AbortError") {
        this.setState("error")
      }
      throw err
    }
  }

  async joinSession(code: string): Promise<SessionInfo> {
    this.setState("connecting")
    const attempt = ++this.connectionAttempt
    const normalizedCode = normalizeCode(code)

    this.abortController?.abort()
    this.abortController = new AbortController()

    try {
      // Step 1: Join session via HTTP API
      const res = await fetch(`${this.httpUrl}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionCode: normalizedCode }),
        signal: this.abortController.signal,
      })
      if (!res.ok) throw new Error("Failed to join session")

      const data = await res.json()
      if (!data.success) throw new Error(data.error?.message || "Unknown error")

      const roomId = data.data.sessionId || data.data.id

      this.code = normalizedCode
      this.sessionId = roomId
      this.role = "guest"

      // Step 2: Connect WebSocket
      await this.connectWebSocket(normalizedCode, "guest", "direct", attempt)

      return this.buildInfo(roomId, normalizedCode, "guest")
    } catch (err: any) {
      if (err.name !== "AbortError") {
        this.setState("error")
      }
      throw err
    }
  }

  async createGroup(maxMembers?: number): Promise<SessionInfo> {
    this.setState("connecting")
    const attempt = ++this.connectionAttempt

    this.abortController?.abort()
    this.abortController = new AbortController()

    try {
      const res = await fetch(`${this.httpUrl}/group/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostPeerId: this.peerId, maxMembers }),
        signal: this.abortController.signal,
      })
      if (!res.ok) throw new Error("Failed to create group session")

      const data = await res.json()
      if (!data.success) throw new Error(data.error?.message || "Unknown error")

      const code = data.data.sessionCode
      const roomId = data.data.sessionId || data.data.id

      this.code = code
      this.sessionId = roomId
      this.role = "host"

      await this.connectWebSocket(code, "host", "group", attempt)

      return this.buildInfo(roomId, code, "host", true)
    } catch (err: any) {
      if (err.name !== "AbortError") {
        this.setState("error")
      }
      throw err
    }
  }

  async joinGroup(code: string): Promise<SessionInfo> {
    this.setState("connecting")
    const attempt = ++this.connectionAttempt
    const normalizedCode = normalizeCode(code)

    this.abortController?.abort()
    this.abortController = new AbortController()

    try {
      const res = await fetch(`${this.httpUrl}/group/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionCode: normalizedCode }),
        signal: this.abortController.signal,
      })
      if (!res.ok) throw new Error("Failed to join group session")

      const data = await res.json()
      if (!data.success) throw new Error(data.error?.message || "Unknown error")

      const roomId = data.data.sessionId || data.data.id

      this.code = normalizedCode
      this.sessionId = roomId
      this.role = "member"

      await this.connectWebSocket(normalizedCode, "member", "group", attempt)

      return this.buildInfo(roomId, normalizedCode, "member", true)
    } catch (err: any) {
      if (err.name !== "AbortError") {
        this.setState("error")
      }
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

  sendGroupSignal(targetPeerId: string, signal: PeerSignal): void {
    this.sendMessage("GROUP_SIGNAL", { targetPeerId, signal })
  }

  announce(profile: Omit<DevicePresence, "peerId">): void {
    this.lobbyProfile = profile
    this.shouldKeepLobbyConnected = true

    if (this.lobbyWs?.readyState === WebSocket.OPEN) {
      this.sendLobbyAnnouncement()
      return
    }

    this.connectLobby()
  }

  private connectLobby(): void {
    if (!this.shouldKeepLobbyConnected || !this.lobbyProfile) return
    if (
      this.lobbyWs?.readyState === WebSocket.OPEN ||
      this.lobbyWs?.readyState === WebSocket.CONNECTING
    )
      return

    this.clearLobbyReconnectTimeout()

    const endpoint = new URL(this.url)
    endpoint.protocol = endpoint.protocol === "https:" ? "wss:" : "ws:"
    const basePath = endpoint.pathname === "/" ? "" : endpoint.pathname
    endpoint.pathname = basePath + "/lobby"
    endpoint.search = ""
    endpoint.hash = ""

    const ws = new WebSocket(endpoint.toString())
    this.lobbyWs = ws

    ws.onopen = () => {
      if (this.lobbyWs !== ws) return
      this.lobbyReconnectAttempts = 0
      this.sendLobbyAnnouncement()
      this.startLobbyPing(ws)
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === "ROSTER" && Array.isArray(msg.payload?.devices)) {
          // Keep the frontend safe with older workers that broadcast the
          // complete roster, including the requesting device.
          const devices = msg.payload.devices.filter(
            (device: DevicePresence) =>
              device?.peerId && device.peerId !== this.peerId,
          )
          this.emit({ type: "roster", devices })
        } else if (
          msg.type === "INVITE" &&
          typeof msg.payload?.code === "string"
        ) {
          this.emit({
            type: "invite",
            from: msg.payload.from ?? "remote",
            fromName: msg.payload.fromName ?? "Someone",
            code: msg.payload.code,
          })
        }
      } catch (err) {
              }
    }

    ws.onerror = () => {
      // Browsers follow this with close. Reconnect there so a failure cannot
      // create overlapping lobby sockets.
          }

    ws.onclose = (ev) => {
      if (this.lobbyWs !== ws) return
            this.lobbyWs = null
      this.stopLobbyPing()
      this.emit({ type: "roster", devices: [] })
      this.scheduleLobbyReconnect()
    }
  }

  private sendLobbyAnnouncement(): void {
    if (!this.lobbyProfile || this.lobbyWs?.readyState !== WebSocket.OPEN)
      return
    this.lobbyWs.send(
      JSON.stringify({
        type: "ANNOUNCE",
        peerId: this.peerId,
        payload: { profile: this.lobbyProfile },
      }),
    )
  }

  private startLobbyPing(ws: WebSocket): void {
    this.stopLobbyPing()
    this.lobbyPingInterval = window.setInterval(() => {
      if (this.lobbyWs === ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "PING" }))
      }
    }, 15_000)
  }

  private stopLobbyPing(): void {
    if (this.lobbyPingInterval !== null) {
      clearInterval(this.lobbyPingInterval)
      this.lobbyPingInterval = null
    }
  }

  private scheduleLobbyReconnect(): void {
    if (!this.shouldKeepLobbyConnected || this.lobbyReconnectTimeout !== null)
      return
    const delay = Math.min(1_000 * 2 ** this.lobbyReconnectAttempts, 15_000)
    this.lobbyReconnectAttempts++
    this.lobbyReconnectTimeout = window.setTimeout(() => {
      this.lobbyReconnectTimeout = null
      this.connectLobby()
    }, delay)
  }

  private clearLobbyReconnectTimeout(): void {
    if (this.lobbyReconnectTimeout !== null) {
      clearTimeout(this.lobbyReconnectTimeout)
      this.lobbyReconnectTimeout = null
    }
  }

  invite(targetPeerId: string, code: string): void {
    if (this.lobbyWs && this.lobbyWs.readyState === WebSocket.OPEN) {
      this.lobbyWs.send(
        JSON.stringify({
          type: "INVITE",
          peerId: this.peerId,
          payload: { targetPeerId, code },
        }),
      )
    }
  }

  close(): void {
    this.shouldKeepLobbyConnected = false
    this.lobbyProfile = null
    this.clearLobbyReconnectTimeout()
    this.stopLobbyPing()
    this.sendMessage(this.roomType === "group" ? "GROUP_LEAVE" : "LEAVE", {})
    if (this.ws) {
      this.ws.close(1000, "Normal closure")
    }
    if (this.lobbyWs) {
      this.lobbyWs.close()
      this.lobbyWs = null
    }
    this.cleanup()
    this.setState("closed")
    this.clearListeners()
  }

  private cleanup() {
    this.connectionAttempt++
    this.abortController?.abort()
    this.abortController = null

    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
    this.stopLobbyPing()
    this.clearLobbyReconnectTimeout()
    this.ws = null
    this.lobbyWs = null
    this.code = null
    this.sessionId = null
    this.role = null
    this.hasPeerJoined = false
    this.joinedPeerId = "remote"
  }
}
