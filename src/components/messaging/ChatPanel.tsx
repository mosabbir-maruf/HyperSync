import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { MessageList } from "./MessageList"
import { MessageInput } from "./MessageInput"
import type { MessagingManager } from "../../state/managers/MessagingManager"
import type { SessionManager } from "../../state/managers/SessionManager"
import { cn } from "../../lib/utils"
import { storageProvider } from "../../browser/FileSelectionService"
import { Avatar } from "../ui/Avatar"
import { Button } from "../ui/Button"
import { SendIcon } from "../ui/icons"
import type { TimelineItem } from "./MessageList"

interface ChatPanelProps {
  controller: MessagingManager
  sessionController: SessionManager
  /** Whether the panel is currently visible (for unread tracking). */
  visible: boolean
  onFiles?: (files: File[]) => void
  onLeave: () => void
}

/**
 * ChatPanel — the full messaging surface.
 *
 * Subscribes to MessagingController via useSyncExternalStore (same pattern
 * as SessionProvider) for glitch-free concurrent rendering.
 *
 * Handles:
 * - Rendering MessageList + MessageInput + ChatStatusBar
 * - Reporting panel visibility to controller (drives unread counter)
 * - Forwarding send / typing events to controller
 * - Emoji recent-use tracking
 */
export function ChatPanel({ controller, sessionController, visible, onFiles, onLeave }: ChatPanelProps) {
  const [dragging, setDragging] = useState(false)

  // Subscribe to messaging state
  const state = useSyncExternalStore(
    (cb) => controller.subscribe(cb),
    () => controller.getState(),
  )

  // Subscribe to session state to get transfers and incoming files
  const sessionState = useSyncExternalStore(
    (cb) => sessionController.subscribe(cb),
    () => sessionController.getState(),
  )

  // Report visibility so unread counter resets when panel is open
  const visibleRef = useRef(visible)
  useEffect(() => {
    visibleRef.current = visible
    controller.setPanelVisible(visible)
  }, [visible, controller])

  const handleSend = useCallback(
    (text: string) => {
      controller.sendMessage(text)
    },
    [controller],
  )

  const handleTypingStart = useCallback(() => {
    controller.sendTypingStart()
  }, [controller])

  const handleTypingStop = useCallback(() => {
    controller.sendTypingStop()
  }, [controller])

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      controller.recordRecentEmoji(emoji)
    },
    [controller],
  )

  const handleAttach = useCallback(async () => {
    if (!onFiles) return
    const selection = await storageProvider.pick({ multiple: true })
    if (selection.files.length > 0) onFiles([...selection.files])
  }, [onFiles])

  const isDisabled = sessionState.connectionState !== ConnectionState.CONNECTED

  // Construct unified timeline
  const timeline: TimelineItem[] = [
    ...state.messages.map((m) => ({ type: "message" as const, id: m.id, data: m, timestamp: m.timestamp })),
    ...sessionState.items.map((t) => ({ type: "transfer" as const, id: t.id, data: t, timestamp: t.startedAt })),
  ]

  // Sort chronologically (oldest to newest)
  timeline.sort((a, b) => a.timestamp - b.timestamp)

  // Append incoming prompts at the very bottom (most recent)
  if (sessionState.incoming && sessionState.incoming.length > 0) {
    timeline.push({
      type: "incoming",
      id: "incoming-prompt",
      data: sessionState.incoming,
      timestamp: Date.now(),
    })
  }

  return (
    <div
      onDragOver={(e) => {
        if (!onFiles) return
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDragging(false)
        }
      }}
      onDrop={(e) => {
        if (!onFiles) return
        e.preventDefault()
        setDragging(false)
        const selection = storageProvider.fromDrop(e.dataTransfer)
        if (selection.files.length > 0) onFiles([...selection.files])
      }}
      className={cn(
        "relative flex flex-col border border-border rounded-2xl bg-card overflow-hidden",
        "h-full",
      )}
      role="region"
      aria-label="Chat"
    >
      {/* Drag Overlay */}
      {dragging && onFiles && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-card/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary bg-accent/50 px-10 py-8 text-primary shadow-lg pointer-events-none">
            <SendIcon width={32} height={32} />
            <p className="font-bold tracking-tight text-foreground">Drop files to send</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <Avatar name={state.peerName || "Guest"} size="sm" />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-success" title="Online"></span>
          </div>
          <div className="flex flex-col">
            <span
              className="font-bold truncate text-[15px] leading-tight text-foreground"
              title={state.peerName || "Conversation"}
            >
              {state.peerName || "Conversation"}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground leading-none mt-1">
              {state.isRemoteTyping ? (
                <span className="text-primary animate-pulse">Typing...</span>
              ) : (
                "Connected"
              )}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="sm" onClick={onLeave} className="h-7 text-xs px-2.5 hidden sm:inline-flex">
            End session
          </Button>
          <Button variant="secondary" size="sm" onClick={onLeave} className="h-7 w-7 p-0 sm:hidden" aria-label="End session">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Message list — flex-1 fills available height */}
      <MessageList
        items={timeline}
        peerName={state.peerName}
        isRemoteTyping={state.isRemoteTyping && state.messages.length > 0}
        onPause={(id) => sessionController.pause(id)}
        onResume={(id) => sessionController.resume(id)}
        onCancel={(id) => sessionController.cancel(id)}
        onRetry={(id) => sessionController.retry(id)}
        onAccept={(ids) => void sessionController.accept(ids)}
        onReject={(ids) => sessionController.reject(ids)}
      />

      {/* Input */}
      <div className="px-4 pb-4">
        <MessageInput
          recentEmoji={state.recentEmoji}
          onSend={handleSend}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
          onEmojiSelect={handleEmojiSelect}
          onAttach={onFiles ? handleAttach : undefined}
          disabled={isDisabled}
          autoFocus={visible}
        />
      </div>
    </div>
  )
}
