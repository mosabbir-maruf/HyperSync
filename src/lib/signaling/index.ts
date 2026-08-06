import type { SignalingClient } from "./SignalingClient"
import { WebSocketSignalingClient } from "./WebSocketSignalingClient"

export type { SignalingClient } from "./SignalingClient"
export * from "./types"

/**
 * The application depends only on this interface. This frontend
 * connects to a Cloudflare Workers backend via WebSockets for signaling.
 */
export function createSignalingClient(): SignalingClient {
  const wsUrl = new URL("/api", window.location.origin).toString()

  return new WebSocketSignalingClient(wsUrl)
}
