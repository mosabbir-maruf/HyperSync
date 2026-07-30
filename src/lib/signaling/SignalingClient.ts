import type {
  DevicePresence,
  PeerSignal,
  SessionInfo,
  SignalingConnectionState,
  SignalingEvent,
  SignalingEventHandler,
  SignalingEventType,
  Unsubscribe,
} from "./types"
import { logger } from "../../services/Logger"

/**
 * The single contract every signaling transport implements.
 *
 * Consumers (PeerConnection, useSession) depend ONLY on this interface — never
 * on a concrete adapter — so the in-memory dev transport can be swapped 1:1 for
 * the Cloudflare Worker + Durable Objects transport with zero call-site changes.
 */
export interface SignalingClient {
  readonly state: SignalingConnectionState

  /** Host: create a fresh session and return its pairing info. */
  createSession(): Promise<SessionInfo>

  /** Guest: join an existing session by its short code. */
  joinSession(code: string): Promise<SessionInfo>

  /** Relay a WebRTC negotiation signal to the other peer. */
  send(signal: PeerSignal): void

  // ---- discovery / presence (the "nearby devices" lobby) -----------------

  /**
   * Join the discovery lobby and advertise this device. The transport assigns
   * the peerId; consumers receive the current roster via the "roster" event.
   */
  announce(profile: Omit<DevicePresence, "peerId">): void

  /**
   * Ask another advertised device to auto-join a freshly created session.
   * The target receives an "invite" event carrying the pairing code.
   */
  invite(targetPeerId: string, code: string): void

  /** Subscribe to a signaling event. Returns an unsubscribe function. */
  on<T extends SignalingEventType>(
    type: T,
    handler: SignalingEventHandler<T>,
  ): Unsubscribe

  /** Tear down the signaling connection and free the session slot. */
  close(): void
}

/** Small typed event bus shared by adapters. */
export class SignalingEmitter {
  private handlers = new Map<SignalingEventType, Set<SignalingEventHandler>>()

  on<T extends SignalingEventType,>(
    type: T,
    handler: SignalingEventHandler<T>,
  ): Unsubscribe {
    let set = this.handlers.get(type)
    if (!set) {
      set = new Set()
      this.handlers.set(type, set)
    }
    set.add(handler as unknown as SignalingEventHandler)
    return () => set!.delete(handler as unknown as SignalingEventHandler)
  }

  protected emit(event: SignalingEvent): void {
    const set = this.handlers.get(event.type)
    if (!set) return
    for (const handler of set) {
      try {
        handler(event as never)
      } catch (err) {
        // A misbehaving listener must not break the transport.
        logger.warn("Signaling event listener failed", err)
      }
    }
  }

  protected clearListeners(): void {
    this.handlers.clear()
  }
}
