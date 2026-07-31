import { MessageEngine } from "../../lib/messaging/MessageEngine"
import type { ChatMessage, MessageEngineEvent } from "../../lib/messaging/MessageEngine"
import { randomId } from "../../lib/utils"

export interface MessagingState {
  messages: ChatMessage[]
  isRemoteTyping: boolean
  unreadCount: number
  recentEmoji: string[]
  peerName: string | null
}

const INITIAL_STATE: MessagingState = {
  messages: [],
  isRemoteTyping: false,
  unreadCount: 0,
  recentEmoji: [],
  peerName: null,
}

const MAX_RECENT_EMOJI = 8
const MAX_HISTORY = 1000

/**
 * MessagingManager — handles text messaging over a dedicated RTCDataChannel.
 * Defers all connection state management to ConnectionStateManager.
 */
export class MessagingManager {
  private state: MessagingState = { ...INITIAL_STATE }
  private listeners = new Set<(s: MessagingState) => void>()
  private engine: MessageEngine
  private panelVisible = false
  private remoteTypingTimer: ReturnType<typeof setTimeout> | null = null
  private unsubEngine: (() => void) | null = null

  // We allow an external observer to listen to raw engine events (like ChannelOpen/Close)
  // so that ConnectionStateManager can consume them.
  private eventListeners = new Set<(e: MessageEngineEvent) => void>()

  constructor(channel: RTCDataChannel) {
    let localName = ""
    try {
      const stored = localStorage.getItem("hypersync.settings")
      if (stored) localName = JSON.parse(stored).displayName || ""
    } catch {
      // ignore
    }

    this.engine = new MessageEngine(channel, localName)
    this.unsubEngine = this.engine.onEvent((event) => {
      // Forward raw events to SessionManager/ConnectionStateManager
      for (const listener of this.eventListeners) {
        listener(event)
      }

      switch (event.type) {
        case "MessageSent": {
          const updated = this.state.messages.map((m) =>
            m.id === event.id && m.status === "sending"
              ? { ...m, status: "sent" as const }
              : m,
          )
          this.set({ messages: updated })
          break
        }

        case "MessageDelivered": {
          const updated = this.state.messages.map((m) =>
            m.id === event.id ? { ...m, status: "delivered" as const } : m,
          )
          this.set({ messages: updated })
          break
        }

        case "MessageFailed": {
          const updated = this.state.messages.map((m) =>
            m.id === event.id ? { ...m, status: "failed" as const } : m,
          )
          this.set({ messages: updated })
          break
        }

        case "MessageReceived": {
          const msgs = [...this.state.messages, event.message].slice(-MAX_HISTORY)
          const unread = this.panelVisible ? 0 : this.state.unreadCount + 1
          this.set({ messages: msgs, unreadCount: unread })
          break
        }

        case "TypingStarted":
          this.set({ isRemoteTyping: true })
          this.clearRemoteTypingTimer()
          this.remoteTypingTimer = setTimeout(() => {
            this.set({ isRemoteTyping: false })
          }, 5_000)
          break

        case "TypingStopped":
          this.clearRemoteTypingTimer()
          this.set({ isRemoteTyping: false })
          break
          
        case "PeerNameReceived":
          this.set({ peerName: event.name })
          break
          
        // Connection events (ChannelOpen, ChannelClose, PeerOnline, PeerOffline) 
        // are ignored by MessagingState because ConnectionStateManager owns that truth now.
      }
    })
  }

  public onEngineEvent(fn: (e: MessageEngineEvent) => void): () => void {
    this.eventListeners.add(fn)
    return () => this.eventListeners.delete(fn)
  }

  public subscribe(fn: (s: MessagingState) => void): () => void {
    this.listeners.add(fn)
    fn(this.state)
    return () => this.listeners.delete(fn)
  }

  public getState(): MessagingState {
    return this.state
  }

  private set(patch: Partial<MessagingState>): void {
    this.state = { ...this.state, ...patch }
    for (const fn of this.listeners) fn(this.state)
  }

  public setPanelVisible(visible: boolean): void {
    this.panelVisible = visible
    if (visible) this.set({ unreadCount: 0 })
  }

  public sendMessage(text: string): void {
    const trimmed = text.trimEnd().slice(0, 500)
    if (!trimmed) return

    const id = `msg_${randomId().slice(0, 8)}`
    const msg = this.engine.sendMessage(id, trimmed)

    const msgs = [...this.state.messages, msg].slice(-MAX_HISTORY)
    this.set({ messages: msgs })
  }

  public sendTypingStart(): void {
    this.engine.sendTypingStart()
  }

  public sendTypingStop(): void {
    this.engine.sendTypingStop()
  }

  public recordRecentEmoji(emoji: string): void {
    const filtered = this.state.recentEmoji.filter((e) => e !== emoji)
    const recent = [emoji, ...filtered].slice(0, MAX_RECENT_EMOJI)
    this.set({ recentEmoji: recent })
  }

  private clearRemoteTypingTimer(): void {
    if (this.remoteTypingTimer !== null) {
      clearTimeout(this.remoteTypingTimer)
      this.remoteTypingTimer = null
    }
  }

  public destroy(): void {
    this.clearRemoteTypingTimer()
    this.unsubEngine?.()
    this.engine.destroy()
    this.listeners.clear()
    this.eventListeners.clear()
    this.state = { ...INITIAL_STATE }
  }
}
