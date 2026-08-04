// ─────────────────────────────────────────────────────────────────────────────
// Messaging Protocol Types
// Completely separate from the file-transfer protocol in ../transfer/protocol.ts
// ─────────────────────────────────────────────────────────────────────────────

export type MsgType = "MESSAGE" | "MESSAGE_ACK" | "TYPING_START" | "TYPING_STOP" | "REACTION" | "STATUS" | "PING" | "PONG"

/** Wire-format frame sent over the message DataChannel. */
export interface MsgFrame {
  t: MsgType
  /** Stable message id — used for ACK matching. */
  id?: string
  /** Message text content (MESSAGE frames only). */
  text?: string
  /** Unix epoch ms timestamp. */
  ts?: number
  /** Emoji reaction (REACTION frames only). */
  emoji?: string
  /** Reaction target message id (REACTION frames only). */
  targetId?: string
  /** Display name of the sender (STATUS handshake frames only). */
  name?: string
}

/** Delivery status of a local outbound message. */
export type MessageStatus = "sending" | "sent" | "delivered" | "failed"

export interface ChatMessage {
  /** Stable local ID (random). */
  id: string
  /** "local" = sent by this device; "remote" = received from peer; "system" = system message */
  senderId: "local" | "remote" | "system" | string
  text: string
  timestamp: number
  status: MessageStatus
  subjectName?: string
}

/** Events emitted by MessageEngine. */
export type MessageEngineEvent = {
  type: "MessageReceived"
  message: ChatMessage
} | { type: "MessageSent"; id: string } | {
  type: "MessageDelivered"
  id: string
} | { type: "MessageFailed"; id: string } | { type: "TypingStarted" } | {
  type: "TypingStopped"
} | { type: "PeerNameReceived"; name: string } | { type: "PeerOnline" } | {
  type: "PeerOffline"
} | { type: "ChannelOpen" } | { type: "ChannelClose" }

export type MessageEngineEventHandler = (event: MessageEngineEvent) => void

// ─────────────────────────────────────────────────────────────────────────────
// Protocol encode / decode helpers
// ─────────────────────────────────────────────────────────────────────────────

export function encodeFrame(frame: MsgFrame): string {
  return JSON.stringify(frame)
}

export function decodeFrame(raw: string): MsgFrame | null {
  try {
    return JSON.parse(raw) as MsgFrame
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Maximum UTF-16 code-unit length of a single message. */
export const MAX_MESSAGE_LENGTH = 500
/** Minimum ms between TYPING_START signals sent to remote. */
export const TYPING_THROTTLE_MS = 2_000
/** Ms of input silence before TYPING_STOP is sent. */
export const TYPING_STOP_DELAY_MS = 3_000
/** Ping interval ms. */
export const PING_INTERVAL_MS = 30_000
/** Pong timeout ms before declaring peer offline. */
export const PONG_TIMEOUT_MS = 8_000
/** Max outbound messages queued while channel is closed. */
export const MAX_QUEUE_SIZE = 100
/** Max messages per second (token bucket). */
export const RATE_LIMIT_PER_SEC = 5
