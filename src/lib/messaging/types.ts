export type MsgType = "MESSAGE" | "MESSAGE_ACK" | "TYPING_START" | "TYPING_STOP" | "REACTION" | "STATUS" | "PING" | "PONG"

export interface MsgFrame {
  t: MsgType
  id?: string
  text?: string
  ts?: number
  emoji?: string
  targetId?: string
  name?: string
}

export type MessageStatus = "sending" | "sent" | "delivered" | "failed"

export interface ChatMessage {
  id: string
  senderId: "local" | "remote" | "system" | string
  text: string
  timestamp: number
  status: MessageStatus
  subjectName?: string
}

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

export const MAX_MESSAGE_LENGTH = 500
export const TYPING_THROTTLE_MS = 2_000
export const TYPING_STOP_DELAY_MS = 3_000
export const PING_INTERVAL_MS = 30_000
export const PONG_TIMEOUT_MS = 8_000
export const MAX_QUEUE_SIZE = 100
export const RATE_LIMIT_PER_SEC = 5
