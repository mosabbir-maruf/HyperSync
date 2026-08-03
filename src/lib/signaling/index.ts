import type { SignalingClient } from "./SignalingClient"
import { InMemorySignalingClient } from "./InMemorySignalingClient"
import { WebSocketSignalingClient } from "./WebSocketSignalingClient"

export type { SignalingClient } from "./SignalingClient"
export * from "./types"

const DEFAULT_SIGNALING_URL =
  "https://dropsync2-0-backend.thevamp-cloud.workers.dev"

/**
 * The application depends only on this interface. This browser-only frontend
 * deliberately ships an in-memory mock and does not contain Worker/WebSocket
 * implementation code. A future signaling transport can be supplied here
 * without changing React, pairing, WebRTC, or transfer modules.
 */
export function createSignalingClient(): SignalingClient {
  // Every device must use the same presence service. The old localhost
  // fallback split a desktop opened on localhost from a phone opened through
  // the desktop's LAN IP, so they quietly joined different lobbies. Set
  // VITE_WS_URL explicitly when testing a local worker.
  const wsUrl = import.meta.env.VITE_WS_URL || DEFAULT_SIGNALING_URL

  // If explicitly requested, use in-memory mock for dev testing without backend
  if (import.meta.env.VITE_USE_MOCK_SIGNALING === "true") {
    return new InMemorySignalingClient()
  }
  return new WebSocketSignalingClient(wsUrl)
}
