import { memo, useState } from "react"
import { Button } from "../ui/Button"
import { DownloadIcon } from "../ui/icons"
import type { FileMetadata } from "../../lib/transfer/types"
import { formatBytes, sanitizeFilename } from "../../lib/utils"
import { cn } from "../../lib/utils"
import { Avatar } from "../ui/Avatar"

interface Props {
  files: FileMetadata[]
  peerName?: string | null
  onAccept: (ids: string[]) => void
  onReject: (ids: string[]) => void
}

function formatMsgTime(ts: number): string {
  const d = new Date(ts)
  const h = d.getHours().toString().padStart(2, "0")
  const m = d.getMinutes().toString().padStart(2, "0")
  return `${h}:${m}`
}

export const IncomingBubble = memo(function IncomingBubble({
  files,
  peerName,
  onAccept,
  onReject,
}: Props) {
  const ids = files.map((f) => f.transferId)
  const total = files.reduce((sum, f) => sum + f.fileSize, 0)

  // Incoming prompts are always from the remote peer, so they align left
  const isLocal = false
  
  const [timestamp] = useState(Date.now)

  return (
    <div
      className={cn("flex w-full justify-start")}
      role="region"
      aria-label="Incoming file request"
    >
      <div className="flex gap-2 w-full sm:max-w-[82%] flex-row">
        {/* Avatar for remote */}
        <div className="flex flex-col justify-end pb-[22px] shrink-0">
          <Avatar name={peerName || "Guest"} size="sm" />
        </div>

        <div className="flex flex-col gap-1 min-w-0 items-start">
          <div
            className={cn(
              "relative w-full sm:w-[380px] rounded-2xl overflow-hidden shadow-sm",
              "bg-secondary text-secondary-foreground border border-border rounded-bl-sm",
            )}
          >
            <div className="flex items-center gap-3 border-b border-border/50 bg-accent/50 px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                <DownloadIcon width={18} height={18} />
              </span>
              <div>
                <p className="text-sm font-bold tracking-tight">
                  Incoming files
                </p>
                <p className="label-mono mt-0.5 opacity-80">
                  {files.length} file{files.length > 1 ? "s" : ""} ·{" "}
                  {formatBytes(total)}
                </p>
              </div>
            </div>

            <ul className="max-h-40 divide-y divide-border/50 overflow-auto px-4">
              {files.map((f) => (
                <li
                  key={f.transferId}
                  className="flex items-center justify-between py-2.5 text-[13px]"
                >
                  <span className="truncate pr-3 font-medium">
                    {sanitizeFilename(f.fileName)}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] opacity-70">
                    {formatBytes(f.fileSize)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex gap-px border-t border-border bg-border">
              <Button
                variant="ghost"
                className="flex-1 rounded-none bg-secondary hover:bg-secondary/80 h-10"
                onClick={() => onReject(ids)}
              >
                Decline
              </Button>
              <Button
                className="flex-1 rounded-none h-10"
                onClick={() => onAccept(ids)}
              >
                Accept & Save
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-1">
            <time dateTime={new Date(timestamp).toISOString()} className="label-mono">
              {formatMsgTime(timestamp)}
            </time>
          </div>
        </div>
      </div>
    </div>
  )
})
