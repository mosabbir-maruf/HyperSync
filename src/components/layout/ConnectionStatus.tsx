import { ConnectionState } from "../../state/managers/ConnectionStateManager"
import { cn } from "../../lib/utils"

const MAP: Record<ConnectionState, { label: string dot: string text: string }> =
  {
    [ConnectionState.DISCONNECTED]: {
      label: "Not connected",
      dot: "bg-muted-foreground",
      text: "text-muted-foreground",
    },
    [ConnectionState.SIGNALING]: {
      label: "Starting",
      dot: "bg-warning animate-pulse",
      text: "text-muted-foreground",
    },
    [ConnectionState.PAIRING]: {
      label: "Waiting for peer",
      dot: "bg-warning animate-pulse",
      text: "text-foreground",
    },
    [ConnectionState.CONNECTING]: {
      label: "Connecting",
      dot: "bg-warning animate-pulse",
      text: "text-foreground",
    },
    [ConnectionState.NEGOTIATING]: {
      label: "Negotiating",
      dot: "bg-warning animate-pulse",
      text: "text-foreground",
    },
    [ConnectionState.CONNECTED]: {
      label: "Link established",
      dot: "bg-success",
      text: "text-foreground",
    },
    [ConnectionState.DEGRADED]: {
      label: "Degraded",
      dot: "bg-warning",
      text: "text-warning",
    },
    [ConnectionState.RECONNECTING]: {
      label: "Reconnecting",
      dot: "bg-warning animate-pulse",
      text: "text-warning",
    },
    [ConnectionState.FAILED]: {
      label: "Failed",
      dot: "bg-destructive",
      text: "text-destructive",
    },
  }

export function ConnectionStatus({ phase }: { phase: ConnectionState }) {
  const s = MAP[phase] || MAP[ConnectionState.DISCONNECTED]
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      <span className={s.text}>{s.label}</span>
    </span>
  )
}
