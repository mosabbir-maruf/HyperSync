/**
 * Signaling protocol types.
 *
 * The signaling channel ONLY carries session control + WebRTC negotiation
 * (SDP offer/answer, ICE candidates). It never carries file bytes.
 * These types are the wire contract shared by every SignalingClient adapter
 * (in-memory dev today; Cloudflare Worker + Durable Objects later).
 */

export type Role = "host" | "guest" | "member"

export interface SessionInfo {
  sessionId: string
  /** Short human-friendly pairing code (host only issues it). */
  code: string
  role: Role
  /** Absolute URL a guest can open to auto-join (encodes the code). */
  joinUrl: string
}

export type SignalingConnectionState = "idle" | "connecting" | "connected" | "closed" | "error"

/** Messages relayed between the two peers of a session, verbatim. */
export type PeerSignal = { kind: "offer" sdp: RTCSessionDescriptionInit } | {
  kind: "answer"
  sdp: RTCSessionDescriptionInit
} | { kind: "ice" candidate: RTCIceCandidateInit }

/**
 * A device advertising itself on the local discovery lobby. Carries only a
 * display identity — never file data. The lobby is the presence layer that
 * powers "nearby devices"; the future Durable Object models it identically.
 */
export interface DevicePresence {
  peerId: string
  name: string
  /** Accent color for the device avatar (hex). */
  color: string
  /** Coarse platform label, e.g. "macOS", "iOS", "Windows". */
  platform: string
}

/** Events an adapter emits to its consumer. */
export type SignalingEvent = {
  type: "state"
  state: SignalingConnectionState
} | { type: "peer-joined" peerId: string } | {
  type: "peer-left"
  peerId: string
} | { type: "signal" from: string signal: PeerSignal } | {
  type: "group-peer-joined"
  peerId: string
  role: Role
} | {
  type: "group-peer-left"
  peerId: string
} | {
  type: "group-signal"
  from: string
  signal: PeerSignal
} | {
  type: "roster"
  devices: DevicePresence[]
} | { type: "invite" from: string fromName: string code: string } | {
  type: "error"
  message: string
}

export type SignalingEventType = SignalingEvent["type"]

export type SignalingEventHandler<T extends SignalingEventType = SignalingEventType,> = (
  event: Extract<SignalingEvent, { type: T }>,
) => void

export type Unsubscribe = () => void

/** Runtime guard: reject anything that is not a valid PeerSignal. */
export function isPeerSignal(value: unknown): value is PeerSignal {
  if (!value || typeof value !== "object") return false
  const v = value as Record<string, unknown>
  if (v.kind === "offer" || v.kind === "answer") {
    return typeof v.sdp === "object" && v.sdp !== null
  }
  if (v.kind === "ice") {
    return typeof v.candidate === "object" && v.candidate !== null
  }
  return false
}
