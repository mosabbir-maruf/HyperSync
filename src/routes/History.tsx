import { useHistory } from "../state/history"
import { Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import {
  CheckIcon,
  CloseIcon,
  HistoryIcon,
  ReceiveIcon,
  SendIcon,
} from "../components/ui/icons"
import { formatBytes, sanitizeFilename } from "../lib/utils"

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

export function History() {
  const { entries, clear } = useHistory()

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden px-4 pt-8 pb-12 text-center sm:px-8">
        <div className="relative z-10 max-w-3xl space-y-8">
          <div className="mx-auto flex w-max items-center gap-3">
            <span className="label-mono">Transfer log</span>
            <span className="h-px w-8 bg-border-strong" />
            {entries.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={clear}
                className="h-6 text-[10px] uppercase tracking-widest text-primary hover:text-primary/80"
              >
                Clear history
              </Button>
            ) : (
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                Local Device
              </span>
            )}
          </div>
          <h1 className="text-4xl font-black leading-[0.9] tracking-tighter md:text-6xl lg:text-7xl">
            History. <br />
            <span className="text-[#cf4322]">Local device.</span>
          </h1>
        </div>
      </section>

      {entries.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
            <HistoryIcon width={22} height={22} />
          </span>
          <p className="text-sm font-bold tracking-tight">No transfers yet</p>
          <p className="max-w-xs text-[13px] text-muted-foreground">
            Completed and cancelled transfers will appear here for quick
            reference.
          </p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={e.id}>
              <Card className="flex items-center gap-3 px-3.5 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                  {e.direction === "send" ? (
                    <SendIcon width={17} height={17} />
                  ) : (
                    <ReceiveIcon width={17} height={17} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {sanitizeFilename(e.name)}
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {formatBytes(e.size)} · {relativeTime(e.timestamp)}
                  </p>
                </div>
                <span
                  className={
                    "flex h-6 w-6 items-center justify-center rounded-full " +
                    (e.status === "completed"
                      ? "bg-success text-primary-foreground"
                      : "bg-muted text-muted-foreground")
                  }
                  title={e.status}
                >
                  {e.status === "completed" ? (
                    <CheckIcon width={14} height={14} />
                  ) : (
                    <CloseIcon width={14} height={14} />
                  )}
                </span>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
