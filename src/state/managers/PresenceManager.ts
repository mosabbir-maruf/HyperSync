import type { ConnectionStateManager } from "./ConnectionStateManager"
import type { MessageEngineEvent } from "../../lib/messaging/types"

/**
 * PresenceManager
 *
 * Adapts the ping/pong lifecycle (emitted by MessageEngine)
 * into heartbeat health signals for the ConnectionStateManager.
 */
export class PresenceManager {
  private unsubscribe: (() => void) | null = null

  constructor(private connectionState: ConnectionStateManager) {}

  public observe(
    subscribeToEngineEvents: (
      fn: (e: MessageEngineEvent) => void,
    ) => () => void,
  ) {
    if (this.unsubscribe) this.unsubscribe()

    this.unsubscribe = subscribeToEngineEvents((event) => {
      if (event.type === "PeerOnline") {
        this.connectionState.setHeartbeatHealthy(true)
      } else if (event.type === "PeerOffline") {
        this.connectionState.setHeartbeatHealthy(false)
      }
    })
  }

  public destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
    this.connectionState.setHeartbeatHealthy(false)
  }
}
