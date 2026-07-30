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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">History</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stored on this device only — file names and sizes, never contents.
          </p>
        </div>
        {entries.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clear}>
            Clear
          </Button>
        )}
      </div>

      {entries.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center border border-border-strong text-muted-foreground">
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
                <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-border-strong text-muted-foreground">
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
                    "flex h-6 w-6 items-center justify-center " +
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
