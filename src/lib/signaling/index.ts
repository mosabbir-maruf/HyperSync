import type { SignalingClient } from "./SignalingClient"
import { InMemorySignalingClient } from "./InMemorySignalingClient"
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
  // Use the explicitly provided URL, or dynamically infer it from the current hostname.
  // This allows local network testing (e.g. from a phone) without needing to hardcode the IP in .env
  let wsUrl = import.meta.env.VITE_WS_URL
  if (!wsUrl) {
    const protocol = window.location.protocol === "https:" ? "https:" : "http:"
    const hostname = window.location.hostname === "localhost" ? "127.0.0.1" : window.location.hostname
    wsUrl = `${protocol}//${hostname}:8787`
  }
  
  // If explicitly requested, use in-memory mock for dev testing without backend
  if (import.meta.env.VITE_USE_MOCK_SIGNALING === "true") {
    return new InMemorySignalingClient()
  }
  return new WebSocketSignalingClient(wsUrl)
}
