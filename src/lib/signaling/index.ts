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
  let wsUrl = import.meta.env.VITE_WS_URL as string
  
  if (wsUrl && wsUrl.startsWith("/")) {
    wsUrl = new URL(wsUrl, window.location.origin).toString()
  }
  if (!wsUrl && import.meta.env.VITE_USE_MOCK_SIGNALING !== "true") {
    throw new Error("VITE_WS_URL environment variable is required to connect to the backend.");
  }

  // If explicitly requested, use in-memory mock for dev testing without backend
  if (import.meta.env.VITE_USE_MOCK_SIGNALING === "true") {
    return new InMemorySignalingClient()
  }
  return new WebSocketSignalingClient(wsUrl)
}
