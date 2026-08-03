import { MessageEngine } from "../../lib/messaging/MessageEngine"
import type {
  ChatMessage,
  MessageEngineEvent,
} from "../../lib/messaging/MessageEngine"
import { randomId } from "../../lib/utils"

export interface GroupMessagingState {
  messages: ChatMessage[]
  typingPeers: string[] // List of peer display names currently typing
  unreadCount: number
  recentEmoji: string[]
  memberNames: string[]
}

const INITIAL_STATE: GroupMessagingState = {
  messages: [],
  typingPeers: [],
  unreadCount: 0,
  recentEmoji: [],
  memberNames: [],
}

const MAX_RECENT_EMOJI = 8
const MAX_HISTORY = 1000

export class GroupMessagingManager {
  private state: GroupMessagingState = { ...INITIAL_STATE }
  private listeners = new Set<(s: GroupMessagingState) => void>()

  private engines = new Map<string, MessageEngine>()
  private unsubs = new Map<string, () => void>()
  private peerNames = new Map<string, string>() // peerId -> display name
  private typingState = new Map<string, ReturnType<typeof setTimeout>>() // peerId -> timeout

  private panelVisible = false

  // Emit raw engine events for GroupConnectionManager if needed
  private eventListeners = new Set<(
    peerId: string,
    e: MessageEngineEvent,
  ) => void>()

  constructor() {}

  public attachEngine(peerId: string, channel: RTCDataChannel) {
    let localName = ""
    try {
      const stored = localStorage.getItem("hypersync.settings")
      if (stored) localName = JSON.parse(stored).displayName || ""
    } catch {
      // ignore
    }

    const engine = new MessageEngine(channel, localName)
    this.engines.set(peerId, engine)

    const unsub = engine.onEvent((event) => {
      // Forward raw events
      for (const listener of this.eventListeners) {
        listener(peerId, event)
      }

      switch (event.type) {
        case "MessageSent":
        case "MessageDelivered":
        case "MessageFailed": {
          // In a group, we might not track individual delivery status easily for a unified bubble,
          // or we can just ignore delivery statuses until ALL deliver.
          // For simplicity, we just mark as delivered if at least one delivered, or we skip updating status.
          // Let's just do a simple map update:
          const updated = this.state.messages.map((m) => {
            if (m.id === event.id && m.senderId === "local") {
              if (
                event.type === "MessageDelivered" &&
                m.status !== "delivered"
              ) {
                return { ...m, status: "delivered" as const }
              }
              if (event.type === "MessageSent" && m.status === "sending") {
                return { ...m, status: "sent" as const }
              }
            }
            return m
          })
          this.set({ messages: updated })
          break
        }

        case "MessageReceived": {
          const senderName = this.peerNames.get(peerId) || "Unknown"
          // We override senderId with senderName so UI can show it if needed
          const msg = { ...event.message, senderId: senderName }

          // Check for duplicate messages (if mesh relays them? we don't have mesh relay, so we only get it once)
          if (!this.state.messages.find((m) => m.id === msg.id)) {
            const msgs = [...this.state.messages, msg].slice(-MAX_HISTORY)
            const unread = this.panelVisible ? 0 : this.state.unreadCount + 1
            this.set({ messages: msgs, unreadCount: unread })
          }
          break
        }

        case "TypingStarted": {
          const name = this.peerNames.get(peerId) || "Someone"
          this.clearTypingTimer(peerId)
          this.typingState.set(
            peerId,
            setTimeout(() => this.stopTyping(peerId), 5_000),
          )
          this.updateTypingState()
          break
        }

        case "TypingStopped":
          this.stopTyping(peerId)
          break

        case "PeerNameReceived": {
          const currentName = this.peerNames.get(peerId)
          if (currentName !== event.name) {
            const isAlreadyInGroup = Array.from(
              this.peerNames.values(),
            ).includes(event.name)
            this.peerNames.set(peerId, event.name)
            this.set({ memberNames: Array.from(this.peerNames.values()) })
            if (!isAlreadyInGroup) {
              this.addSystemMessage(`${event.name} joined`, event.name)
            }
          }
          break
        }
      }
    })

    this.unsubs.set(peerId, unsub)
  }

  public removeEngine(peerId: string) {
    const unsub = this.unsubs.get(peerId)
    if (unsub) unsub()
    this.unsubs.delete(peerId)

    const engine = this.engines.get(peerId)
    if (engine) {
      engine.destroy()
      this.engines.delete(peerId)
    }

    this.stopTyping(peerId)
    const name = this.peerNames.get(peerId)
    this.peerNames.delete(peerId)
    this.set({ memberNames: Array.from(this.peerNames.values()) })

    if (name) {
      const isStillInGroup = Array.from(this.peerNames.values()).includes(name)
      if (!isStillInGroup) {
        this.addSystemMessage(`${name} left`, name)
      }
    }
  }

  private addSystemMessage(text: string, subjectName?: string) {
    const msg: ChatMessage = {
      id: `sys_${randomId().slice(0, 8)}`,
      senderId: "system",
      text,
      timestamp: Date.now(),
      status: "delivered",
      subjectName,
    }
    const msgs = [...this.state.messages, msg].slice(-MAX_HISTORY)
    const unread = this.panelVisible ? 0 : this.state.unreadCount + 1
    this.set({ messages: msgs, unreadCount: unread })
  }

  private stopTyping(peerId: string) {
    this.clearTypingTimer(peerId)
    this.updateTypingState()
  }

  private clearTypingTimer(peerId: string) {
    const timer = this.typingState.get(peerId)
    if (timer) clearTimeout(timer)
    this.typingState.delete(peerId)
  }

  private updateTypingState() {
    const typing = Array.from(this.typingState.keys()).map(
      (id) => this.peerNames.get(id) || "Someone",
    )
    this.set({ typingPeers: typing })
  }

  public onEngineEvent(
    fn: (peerId: string, e: MessageEngineEvent) => void,
  ): () => void {
    this.eventListeners.add(fn)
    return () => this.eventListeners.delete(fn)
  }

  public subscribe(fn: (s: GroupMessagingState) => void): () => void {
    this.listeners.add(fn)
    fn(this.state)
    return () => this.listeners.delete(fn)
  }

  public getState(): GroupMessagingState {
    return this.state
  }

  private set(patch: Partial<GroupMessagingState>): void {
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

    let msgObj: ChatMessage | null = null

    for (const engine of this.engines.values()) {
      const sentMsg = engine.sendMessage(id, trimmed)
      if (!msgObj) msgObj = sentMsg
    }

    if (msgObj) {
      const msgs = [...this.state.messages, msgObj].slice(-MAX_HISTORY)
      this.set({ messages: msgs })
    }
  }

  public sendTypingStart(): void {
    for (const engine of this.engines.values()) {
      engine.sendTypingStart()
    }
  }

  public sendTypingStop(): void {
    for (const engine of this.engines.values()) {
      engine.sendTypingStop()
    }
  }

  public recordRecentEmoji(emoji: string): void {
    const filtered = this.state.recentEmoji.filter((e) => e !== emoji)
    const recent = [emoji, ...filtered].slice(0, MAX_RECENT_EMOJI)
    this.set({ recentEmoji: recent })
  }

  public destroy(): void {
    for (const peerId of this.engines.keys()) {
      this.removeEngine(peerId)
    }
    this.listeners.clear()
    this.eventListeners.clear()
    this.state = { ...INITIAL_STATE }
  }
}
