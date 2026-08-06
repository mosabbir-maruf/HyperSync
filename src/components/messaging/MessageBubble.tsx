import { memo } from "react"
import type { ChatMessage } from "../../lib/messaging/MessageEngine"
import { cn } from "../../lib/utils"
import { Avatar } from "../ui/Avatar"

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

function formatMsgTime(ts: number): string {
  const d = new Date(ts)
  const h = d.getHours().toString().padStart(2, "0")
  const m = d.getMinutes().toString().padStart(2, "0")
  return `${h}:${m}`
}

interface MessageBubbleProps {
  message: ChatMessage
  peerName?: string | null
}

export const MessageBubble = memo(function MessageBubble({
  message,
  peerName,
}: MessageBubbleProps) {
  const isLocal = message.senderId === "local"

  if (message.senderId === "system") {
    return (
      <div className="flex w-full justify-center my-1.5" role="status">
        <div className="flex items-center gap-1.5 bg-secondary/60 px-2 py-1 pr-3 rounded-full max-w-[80%]">
          {message.subjectName && (
            <Avatar
              name={message.subjectName}
              size="sm"
              className="w-5 h-5 text-[9px]"
            />
          )}
          <span className="text-[11px] font-medium text-muted-foreground truncate">
            {message.text}
          </span>
        </div>
      </div>
    )
  }

  // In a group, senderId is the actual sender's name. In 1:1, it's "remote".
  const senderName =
    !isLocal && message.senderId !== "remote"
      ? message.senderId
      : peerName || "Guest"

  return (
    <div
      className={cn("flex w-full", isLocal ? "justify-end" : "justify-start")}
      role="article"
      aria-label={`${isLocal ? "You" : senderName}: ${message.text}`}
    >
      <div
        className={cn(
          "flex gap-2 min-w-0 max-w-[90%] sm:max-w-[82%]",
          isLocal ? "flex-row-reverse" : "flex-row",
        )}
      >
        {/* Avatar for remote */}
        {!isLocal && (
          <div className="flex flex-col justify-end pb-[22px] shrink-0">
            <Avatar name={senderName} size="sm" />
          </div>
        )}

        {/* Message body + timestamp column */}
        <div
          className={cn(
            "flex flex-col gap-1 min-w-0 max-w-full",
            isLocal ? "items-end" : "items-start",
          )}
        >
          {/* Group Sender Name Label */}
          {!isLocal && message.senderId !== "remote" && (
            <span className="text-[10px] text-muted-foreground ml-1 mb-0.5">
              {senderName}
            </span>
          )}
          {/* Bubble */}
          <div
            className={cn(
              "relative rounded-2xl py-2.5 pr-3.5 text-sm leading-relaxed [overflow-wrap:anywhere] [word-break:break-word] overflow-hidden max-w-full",
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
