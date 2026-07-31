import type { SessionPhase } from "../../state/SessionController"
import { cn } from "../../lib/utils"

const MAP: Record<SessionPhase, { label: string dot: string text: string }> = {
  idle: {
    label: "Not connected",
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
  },
  starting: {
    label: "Starting",
    dot: "bg-warning animate-pulse",
    text: "text-muted-foreground",
  },
  waiting: {
    label: "Waiting for peer",
    dot: "bg-warning animate-pulse",
    text: "text-foreground",
  },
  connecting: {
    label: "Negotiating",
    dot: "bg-warning animate-pulse",
    text: "text-foreground",
  },
  connected: {
    label: "Link established",
    dot: "bg-success",
    text: "text-foreground",
  },
  disconnected: {
    label: "Disconnected",
    dot: "bg-destructive",
    text: "text-muted-foreground",
  },
  error: { label: "Error", dot: "bg-destructive", text: "text-destructive" },
}

export function ConnectionStatus({ phase }: { phase: SessionPhase }) {
  const s = MAP[phase]
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      <span className={s.text}>{s.label}</span>
    </span>
  )
}
