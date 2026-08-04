import type { SignalingClient } from "./SignalingClient"
import { WebSocketSignalingClient } from "./WebSocketSignalingClient"

export type { SignalingClient } from "./SignalingClient"
export * from "./types"

/**
 * The application depends only on this interface. This browser-only frontend
 * deliberately ships an in-memory mock and does not contain Worker/WebSocket
 * implementation code. A future signaling transport can be supplied here
 * without changing React, pairing, WebRTC, or transfer modules.
 */
export function createSignalingClient(): SignalingClient {
  // We now route everything through our proxy endpoint (/api) which is intercepted by Cloudflare _redirects
  // or the local Vite proxy. This avoids relying on environment variables for the frontend.
  const wsUrl = new URL("/api", window.location.origin).toString()

  return new WebSocketSignalingClient(wsUrl)
}
