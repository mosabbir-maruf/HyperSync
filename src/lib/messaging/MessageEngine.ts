import {
  type ChatMessage,
  type MsgFrame,
  type MessageEngineEvent,
  type MessageEngineEventHandler,
  type MessageStatus,
  encodeFrame,
  decodeFrame,
  MAX_MESSAGE_LENGTH,
  TYPING_THROTTLE_MS,
  TYPING_STOP_DELAY_MS,
  PING_INTERVAL_MS,
  PONG_TIMEOUT_MS,
  MAX_QUEUE_SIZE,
  RATE_LIMIT_PER_SEC,
} from "./types"

/**
 * MessageEngine — mirrors TransferEngine in structure, but exclusively for
 * text messaging over a dedicated RTCDataChannel ("localshare-msg").
 *
 * Responsibilities:
 * - Send / receive JSON-framed messages.
 * - Delivery ACK round-trip (MESSAGE → MESSAGE_ACK).
 * - Typing indicator with throttle + auto-stop.
 * - Outbound queue (drain on channel open).
 * - Token-bucket rate limiting.
 * - Ping / Pong liveness.
 * - Full cleanup on destroy().
 */
export class MessageEngine {
  private handlers = new Set<MessageEngineEventHandler>()
  private outboundQueue: MsgFrame[] = []
  private isOpen = false
  private isPeerOnline = false

  // Typing state
  private typingThrottleTimer: ReturnType<typeof setTimeout> | null = null
  private typingStopTimer: ReturnType<typeof setTimeout> | null = null
  private lastTypingStartSent = 0

  // Ping/pong
  private pingInterval: ReturnType<typeof setInterval> | null = null
  private pongTimeout: ReturnType<typeof setTimeout> | null = null

  // Rate limiting: token bucket
  private tokens = RATE_LIMIT_PER_SEC
  private tokenRefillTimer: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly channel: RTCDataChannel,
    private readonly localName: string = "",
  ) {
    this.wireChannel()
  }

  // ── Subscriptions ──────────────────────────────────────────────────────────

  onEvent(handler: MessageEngineEventHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  private emit(event: MessageEngineEvent): void {
    for (const h of this.handlers) h(event)
  }

  // ── Channel wiring ─────────────────────────────────────────────────────────

  private wireChannel(): void {
    const ch = this.channel

    const handleOpen = () => {
      this.isOpen = true
      this.isPeerOnline = true
      this.startPing()
      this.startTokenRefill()
      this.drainQueue()
      // Send our display name to the peer so they can show it in the chat header
      if (this.localName) {
        this.rawSend({ t: "STATUS", name: this.localName })
      }
      this.emit({ type: "ChannelOpen" })
      this.emit({ type: "PeerOnline" })
    }

    ch.onopen = handleOpen
    if (ch.readyState === "open") {
      // Fire on next tick to allow subscribers to attach
      setTimeout(handleOpen, 0)
    }

    ch.onclose = () => {
      this.isOpen = false
      this.isPeerOnline = false
      this.stopPing()
      this.emit({ type: "ChannelClose" })
      this.emit({ type: "PeerOffline" })
    }

    ch.onerror = () => {
      this.isOpen = false
      this.isPeerOnline = false
      this.stopPing()
      this.emit({ type: "PeerOffline" })
    }

    ch.onmessage = (ev) => {
      if (typeof ev.data !== "string") return // guard — this channel is text-only
      const frame = decodeFrame(ev.data)
      if (frame) this.handleFrame(frame)
    }

    // (Duplicate block removed. The setTimeout(handleOpen, 0) above handles the already-open case)
  }

  // ── Sending ────────────────────────────────────────────────────────────────

  /**
   * Send a user text message. Returns the ChatMessage immediately (status=sending).
   * Will queue if channel is not yet open.
   */
  sendMessage(id: string, text: string): ChatMessage {
    const trimmed = text.trimEnd().slice(0, MAX_MESSAGE_LENGTH)
    const ts = Date.now()
    const frame: MsgFrame = { t: "MESSAGE", id, text: trimmed, ts }

    const msg: ChatMessage = {
      id,
      senderId: "local",
      text: trimmed,
      timestamp: ts,
      status: "sending",
    }

    if (this.isOpen && this.consumeToken()) {
      this.rawSend(frame)
      this.emit({ type: "MessageSent", id })
      return { ...msg, status: "sent" }
    }

    // Queue for later delivery (preserve order)
    if (this.outboundQueue.length < MAX_QUEUE_SIZE) {
      this.outboundQueue.push(frame)
    } else {
      // Queue full — fail immediately
      this.emit({ type: "MessageFailed", id })
      return { ...msg, status: "failed" }
    }
    return msg
  }

  /** Notify remote peer that local user is typing. Throttled. */
  sendTypingStart(): void {
    const now = Date.now()
    if (now - this.lastTypingStartSent < TYPING_THROTTLE_MS) {
      // Reset the auto-stop timer without sending another TYPING_START
      this.resetTypingStopTimer()
      return
    }
    this.lastTypingStartSent = now
    this.rawSend({ t: "TYPING_START" })
    this.resetTypingStopTimer()
  }

  /** Notify remote peer that local user stopped typing. */
  sendTypingStop(): void {
    this.clearTypingStopTimer()
    this.lastTypingStartSent = 0
    this.rawSend({ t: "TYPING_STOP" })
  }

  // ── Internal send helpers ──────────────────────────────────────────────────

  private rawSend(frame: MsgFrame): void {
    if (this.channel.readyState !== "open") return
    try {
      this.channel.send(encodeFrame(frame))
    } catch {
      // Channel may have closed between check and send — ignore
    }
  }

  private drainQueue(): void {
    while (this.outboundQueue.length > 0 && this.isOpen) {
      const frame = this.outboundQueue.shift()!
      if (this.consumeToken()) {
        this.rawSend(frame)
        if (frame.id) this.emit({ type: "MessageSent", id: frame.id })
      } else {
        // Re-queue at front and stop draining (rate limit)
        this.outboundQueue.unshift(frame)
        break
      }
    }
  }

  // ── Incoming frame handling ────────────────────────────────────────────────

  private handleFrame(frame: MsgFrame): void {
    // Any frame received means the peer is alive
    if (!this.isPeerOnline) {
      this.isPeerOnline = true
      this.emit({ type: "PeerOnline" })
    }

    switch (frame.t) {
      case "MESSAGE": {
        if (!frame.id || !frame.text) return
        const msg: ChatMessage = {
          id: frame.id,
          senderId: "remote",
          text: frame.text.slice(0, MAX_MESSAGE_LENGTH),
          timestamp: frame.ts ?? Date.now(),
          status: "delivered",
        }
        this.emit({ type: "MessageReceived", message: msg })
        // Send ACK
        this.rawSend({ t: "MESSAGE_ACK", id: frame.id })
        break
      }

      case "MESSAGE_ACK": {
        if (frame.id) this.emit({ type: "MessageDelivered", id: frame.id })
        break
      }

      case "TYPING_START":
        this.emit({ type: "TypingStarted" })
        break

      case "TYPING_STOP":
        this.emit({ type: "TypingStopped" })
        break

      case "PING":
        this.rawSend({ t: "PONG" })
        break

      case "PONG":
        this.clearPongTimeout()
        break

      case "STATUS":
        // STATUS carries the peer's display name on channel-open handshake
        if (frame.name)
          this.emit({ type: "PeerNameReceived", name: frame.name })
        break

      case "REACTION":
        // Future extension — silently ignore for now
        break
    }
  }

  // ── Typing timers ──────────────────────────────────────────────────────────

  private resetTypingStopTimer(): void {
    this.clearTypingStopTimer()
    this.typingStopTimer = setTimeout(() => {
      this.sendTypingStop()
    }, TYPING_STOP_DELAY_MS)
  }

  private clearTypingStopTimer(): void {
    if (this.typingStopTimer !== null) {
      clearTimeout(this.typingStopTimer)
      this.typingStopTimer = null
    }
  }

  // ── Ping / Pong ────────────────────────────────────────────────────────────

  private startPing(): void {
    this.stopPing()
    this.pingInterval = setInterval(() => {
      if (!this.isOpen) return
      this.rawSend({ t: "PING" })
      // Expect PONG within PONG_TIMEOUT_MS
      this.pongTimeout = setTimeout(() => {
        if (this.isPeerOnline) {
          this.isPeerOnline = false
          this.emit({ type: "PeerOffline" })
        }
      }, PONG_TIMEOUT_MS)
    }, PING_INTERVAL_MS)
  }

  private stopPing(): void {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
    this.clearPongTimeout()
  }

  private clearPongTimeout(): void {
    if (this.pongTimeout !== null) {
      clearTimeout(this.pongTimeout)
      this.pongTimeout = null
    }
  }

  // ── Token bucket ───────────────────────────────────────────────────────────

  private startTokenRefill(): void {
    if (this.tokenRefillTimer !== null) clearInterval(this.tokenRefillTimer)
    this.tokenRefillTimer = setInterval(() => {
      this.tokens = RATE_LIMIT_PER_SEC
      // Try to drain queue on each refill tick
      if (this.outboundQueue.length > 0) this.drainQueue()
    }, 1_000)
  }

  private consumeToken(): boolean {
    if (this.tokens > 0) {
      this.tokens--
      return true
    }
    return false
  }

  // ── Update message status ──────────────────────────────────────────────────

  /** Called by MessagingController to mark a queued message as failed on destroy. */
  getQueuedIds(): string[] {
    return this.outboundQueue.filter((f) => !!f.id).map((f) => f.id!)
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  destroy(): void {
    this.stopPing()
    this.clearTypingStopTimer()
    if (this.typingThrottleTimer !== null) {
      clearTimeout(this.typingThrottleTimer)
      this.typingThrottleTimer = null
    }
    if (this.tokenRefillTimer !== null) {
      clearInterval(this.tokenRefillTimer)
      this.tokenRefillTimer = null
    }
    this.outboundQueue = []
    this.handlers.clear()
    try {
      this.channel.onopen = null
      this.channel.onclose = null
      this.channel.onerror = null
      this.channel.onmessage = null
      if (
        this.channel.readyState === "open" ||
        this.channel.readyState === "connecting"
      ) {
        this.channel.close()
      }
    } catch {
      /* already closed */
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-export types for convenience
// ─────────────────────────────────────────────────────────────────────────────
export type {
  ChatMessage,
  MessageStatus,
  MessageEngineEvent,
  MessageEngineEventHandler,
}
