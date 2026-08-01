import { useEffect, useRef, memo } from "react"
import { MessageBubble } from "./MessageBubble"
import { TransferBubble } from "./TransferBubble"
import { IncomingBubble } from "./IncomingBubble"
import { TypingIndicator } from "./TypingIndicator"
import type { ChatMessage } from "../../lib/messaging/MessageEngine"
import type { TransferItem, FileMetadata } from "../../lib/transfer/types"

export type TimelineItem = {
  type: "message"
  id: string
  data: ChatMessage
  timestamp: number
} | { type: "transfer" id: string data: TransferItem timestamp: number } | {
  type: "incoming"
  id: string
  data: FileMetadata[]
  timestamp: number
}

import { Avatar } from "../ui/Avatar"
import { FileIcon } from "../ui/icons"

interface MessageListProps {
  items: TimelineItem[]
  peerName?: string | null
  isRemoteTyping: boolean
  viewMode?: "chat" | "files"
  onPause: (id: string) => void
  onResume: (id: string) => void
  onCancel: (id: string) => void
  onRetry: (id: string) => void
  onAccept: (ids: string[]) => void
  onReject: (ids: string[]) => void
}

/**
 * MessageList — scrollable message history with auto-scroll.
 *
 * Messages are rendered as a flat list. Each bubble is memoized (see
 * MessageBubble) so only newly added / status-changed items re-render.
 *
 * Empty state is shown with a minimal hint when no messages exist yet.
 */
export const MessageList = memo(function MessageList({
  items,
  peerName,
  isRemoteTyping,
  viewMode = "chat",
  onPause,
  onResume,
  onCancel,
  onRetry,
  onAccept,
  onReject,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const lastCountRef = useRef(items.length)
  const lastTypingRef = useRef(isRemoteTyping)

  // Auto-scroll to bottom when new items arrive or typing indicator appears
  useEffect(() => {
    const countChanged = items.length !== lastCountRef.current
    const typingChanged = isRemoteTyping !== lastTypingRef.current
    lastCountRef.current = items.length
    lastTypingRef.current = isRemoteTyping

    if (countChanged || typingChanged) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [items.length, isRemoteTyping])

  if (items.length === 0 && !isRemoteTyping) {
    if (viewMode === "files") {
      return (
        <div
          ref={listRef}
          className="flex flex-1 flex-col items-center justify-center overflow-y-auto"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary mb-4">
            <FileIcon width={24} height={24} />
          </div>
          <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
            No files transferred yet
          </h3>
          <p className="text-[13px] text-muted-foreground mt-1 text-center max-w-[240px]">
            Files you send or receive in this session will appear here.
          </p>
        </div>
      )
    }

    return (
      <div
        ref={listRef}
        className="flex flex-1 flex-col items-center justify-center overflow-y-auto"
        role="log"
        aria-label="Message history"
        aria-live="polite"
      >
        <p className="text-[13px] font-medium text-foreground tracking-tight text-center px-6 pt-4">
          Send messages or drag and drop files here
        </p>
        <p className="label-mono text-center px-6 pb-4 mt-2 opacity-70">
          Messages only exist while this session is active
        </p>
      </div>
    )
  }

  return (
    <div
      ref={listRef}
      role="log"
      aria-label="Message history"
      aria-live="polite"
      className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3"
    >
      {items.map((item) => {
        if (item.type === "message") {
          return (
            <MessageBubble
              key={item.id}
              message={item.data}
              peerName={peerName}
            />
          )
        }
        if (item.type === "transfer") {
          return (
            <TransferBubble
              key={item.id}
              item={item.data}
              peerName={peerName}
              onPause={onPause}
              onResume={onResume}
              onCancel={onCancel}
              onRetry={onRetry}
            />
          )
        }
        if (item.type === "incoming") {
          return (
            <IncomingBubble
              key={item.id}
              files={item.data}
              peerName={peerName}
              onAccept={onAccept}
              onReject={onReject}
            />
          )
        }
        return null
      })}
      {isRemoteTyping && (
        <div
          className="flex w-full justify-start"
          role="status"
          aria-label={`${peerName || "Peer"} is typing`}
        >
          <div className="flex gap-2 w-full sm:max-w-[82%] flex-row items-end">
            <div className="flex flex-col justify-end shrink-0">
              <Avatar name={peerName || "Guest"} size="sm" />
            </div>
            <div className="rounded-2xl bg-secondary text-secondary-foreground border border-border px-3.5 py-2.5 rounded-bl-sm mb-1">
              <TypingIndicator />
            </div>
          </div>
        </div>
      )}
      {/* Scroll anchor */}
      <div ref={bottomRef} aria-hidden />
    </div>
  )
})
