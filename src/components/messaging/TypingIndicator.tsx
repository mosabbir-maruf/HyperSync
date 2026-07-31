/**
 * TypingIndicator — three-dot animated indicator shown when
 * the remote peer is composing a message.
 */
export function TypingIndicator() {
  return (
    <div
      className="flex items-center h-[18px]"
      role="status"
      aria-label="Peer is typing"
      aria-live="polite"
    >
      <span className="flex items-center gap-[4px] px-1" aria-hidden>
        <span
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-typing-dot"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-typing-dot"
          style={{ animationDelay: "160ms" }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-typing-dot"
          style={{ animationDelay: "320ms" }}
        />
      </span>
    </div>
  )
}
