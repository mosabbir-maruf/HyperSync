import { cn } from "../../lib/utils"
import { ConnectionState } from "../../state/managers/ConnectionStateManager"

interface ChatStatusBarProps {
  status: ConnectionState
  unreadCount: number
  isRemoteTyping: boolean
  className?: string
}

const STATUS_CONFIG: Record<ConnectionState, { dot: string; label: string }> = {
  [ConnectionState.DISCONNECTED]: { dot: "bg-destructive", label: "Disconnected" },
  [ConnectionState.SIGNALING]: { dot: "bg-warning animate-pulse", label: "Connecting" },
  [ConnectionState.PAIRING]: { dot: "bg-warning animate-pulse", label: "Connecting" },
  [ConnectionState.CONNECTING]: { dot: "bg-warning animate-pulse", label: "Connecting" },
  [ConnectionState.NEGOTIATING]: { dot: "bg-warning animate-pulse", label: "Negotiating" },
  [ConnectionState.CONNECTED]: { dot: "bg-success", label: "Connected" },
  [ConnectionState.DEGRADED]: { dot: "bg-warning", label: "Degraded" },
  [ConnectionState.RECONNECTING]: { dot: "bg-warning animate-pulse", label: "Reconnecting" },
  [ConnectionState.FAILED]: { dot: "bg-destructive", label: "Disconnected" },
}

export function ChatStatusBar({
  status,
  unreadCount,
  isRemoteTyping,
  className,
}: ChatStatusBarProps) {
  const s = STATUS_CONFIG[status] || STATUS_CONFIG[ConnectionState.DISCONNECTED]
  return (
    <div
      className={cn("flex items-center justify-between gap-3", className)}
      role="status"
      aria-live="polite"
      aria-label={`Chat status: ${s.label}`}
    >
      <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
        <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} aria-hidden />
        <span className="text-muted-foreground">
          {isRemoteTyping ? "Typing…" : s.label}
        </span>
      </span>
      {unreadCount > 0 && (
        <span
          className="min-w-[18px] rounded-full bg-primary px-1 text-center font-mono text-[10px] font-semibold text-primary-foreground"
          aria-label={`${unreadCount} unread message${unreadCount !== 1 ? "s" : ""}`}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </div>
  )
}
