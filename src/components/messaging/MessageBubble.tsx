import { memo } from "react"
import type { ChatMessage } from "../../lib/messaging/MessageEngine"
import { cn } from "../../lib/utils"
import { Avatar } from "../ui/Avatar"

// ─────────────────────────────────────────────────────────────────────────────
// Status icon components (inline SVG — no extra imports)
// ─────────────────────────────────────────────────────────────────────────────

function SendingDots() {
  return (
    <span className="flex items-center gap-[2px]" aria-label="Sending">
      <span
        className="h-0.5 w-0.5 rounded-full bg-muted-foreground animate-typing-dot"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="h-0.5 w-0.5 rounded-full bg-muted-foreground animate-typing-dot"
        style={{ animationDelay: "120ms" }}
      />
      <span
        className="h-0.5 w-0.5 rounded-full bg-muted-foreground animate-typing-dot"
        style={{ animationDelay: "240ms" }}
      />
    </span>
  )
}

function SentCheck() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Sent"
      className="text-muted-foreground"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function DeliveredCheck() {
  return (
    <svg
      width="14"
      height="12"
      viewBox="0 0 28 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Delivered"
      className="text-success"
    >
      <path d="M27 6L12 21l-5-5" />
      <path d="M20 6L9 17" />
    </svg>
  )
}

function FailedX() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Failed"
      className="text-destructive"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Timestamp formatting
// ─────────────────────────────────────────────────────────────────────────────

function formatMsgTime(ts: number): string {
  const d = new Date(ts)
  const h = d.getHours().toString().padStart(2, "0")
  const m = d.getMinutes().toString().padStart(2, "0")
  return `${h}:${m}`
}

// ─────────────────────────────────────────────────────────────────────────────
// MessageBubble — memoized to prevent rerenders on unrelated state changes
// ─────────────────────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: ChatMessage
  peerName?: string | null
}

export const MessageBubble = memo(function MessageBubble({
  message,
  peerName,
}: MessageBubbleProps) {
  const isLocal = message.senderId === "local"

  return (
    <div
      className={cn("flex w-full", isLocal ? "justify-end" : "justify-start")}
      role="article"
      aria-label={`${isLocal ? "You" : "Peer"}: ${message.text}`}
    >
      <div
        className={cn(
          "flex gap-2 max-w-[90%] sm:max-w-[82%]",
          isLocal ? "flex-row-reverse" : "flex-row",
        )}
      >
        {/* Avatar for remote */}
        {!isLocal && (
          <div className="flex flex-col justify-end pb-[22px] shrink-0">
            <Avatar name={peerName || "Guest"} size="sm" />
          </div>
        )}

        {/* Message body + timestamp column */}
        <div
          className={cn(
            "flex flex-col gap-1 min-w-0",
            isLocal ? "items-end" : "items-start",
          )}
        >
          {/* Bubble */}
          <div
            className={cn(
              "relative rounded-2xl py-2.5 pr-3.5 text-sm leading-relaxed break-words overflow-hidden",
              isLocal
                ? "bg-card border border-border-strong text-foreground pl-4 rounded-br-sm"
                : "bg-secondary text-secondary-foreground border border-border pl-3.5 rounded-bl-sm",
            )}
          >
            {isLocal && (
              <div className="absolute inset-y-0 left-0 w-[3px] bg-primary" />
            )}
            {/* Render text preserving newlines */}
            <div className="relative z-10">
              {message.text.split("\n").map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
            </div>
          </div>

          {/* Meta row: timestamp + status */}
          <div className="flex items-center gap-1.5 px-1">
            <time
              dateTime={new Date(message.timestamp).toISOString()}
              className="label-mono"
            >
              {formatMsgTime(message.timestamp)}
            </time>
            {isLocal && (
              <span aria-live="polite">
                {message.status === "sending" && <SendingDots />}
                {message.status === "sent" && <SentCheck />}
                {message.status === "delivered" && <DeliveredCheck />}
                {message.status === "failed" && <FailedX />}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})
