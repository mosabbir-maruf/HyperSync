import { memo } from "react"
import { Progress } from "../ui/Progress"
import { IconButton } from "../ui/Button"
import {
  CheckIcon,
  CloseIcon,
  DownloadIcon,
  PauseIcon,
  PlayIcon,
  ReceiveIcon,
  RetryIcon,
  SendIcon,
} from "../ui/icons"
import type { TransferItem } from "../../lib/transfer/types"
import {
  formatBytes,
  formatDuration,
  formatSpeed,
  sanitizeFilename,
} from "../../lib/utils"
import { cn } from "../../lib/utils"
import { Avatar } from "../ui/Avatar"

interface Props {
  item: TransferItem
  peerName?: string | null
  onPause: (id: string) => void
  onResume: (id: string) => void
  onCancel: (id: string) => void
  onRetry: (id: string) => void
}

const STATUS_LABEL: Record<TransferItem["status"], string> = {
  pending: "Waiting",
  progress: "Transferring",
  paused: "Paused",
  completed: "Complete",
  cancelled: "Cancelled",
  failed: "Failed",
}

function formatMsgTime(ts: number): string {
  const d = new Date(ts)
  const h = d.getHours().toString().padStart(2, "0")
  const m = d.getMinutes().toString().padStart(2, "0")
  return `${h}:${m}`
}

export const TransferBubble = memo(function TransferBubble({
  item,
  peerName,
  onPause,
  onResume,
  onCancel,
  onRetry,
}: Props) {
  const isLocal = item.direction === "send"
  const ratio = item.size > 0 ? item.bytesTransferred / item.size : 0
  const isTransferring = item.status === "progress" || item.status === "paused"
  const DirIcon = isLocal ? SendIcon : ReceiveIcon

  return (
    <div
      className={cn("flex w-full", isLocal ? "justify-end" : "justify-start")}
      role="article"
    >
      <div
        className={cn(
          "flex gap-2 w-full sm:max-w-[82%]",
          isLocal ? "flex-row-reverse" : "flex-row",
        )}
      >
        {/* Avatar for remote */}
        {!isLocal && (
          <div className="flex flex-col justify-end pb-[22px] shrink-0">
            <Avatar name={peerName || "Guest"} size="sm" />
          </div>
        )}

        <div
          className={cn(
            "flex flex-col gap-1 min-w-0 w-full",
            isLocal ? "items-end" : "items-start",
          )}
        >
          <div
            className={cn(
              "relative w-full sm:w-[380px] rounded-2xl py-3 pr-4 overflow-hidden shadow-sm",
              isLocal
                ? "bg-card border border-border-strong text-foreground pl-5 rounded-br-sm"
                : "bg-secondary text-secondary-foreground border border-border pl-4 rounded-bl-sm",
            )}
          >
            {isLocal && (
              <div className="absolute inset-y-0 left-0 w-[3px] bg-primary" />
            )}
            <div className="relative z-10 flex items-start gap-3">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full mt-0.5",
                  item.status === "completed"
                    ? "bg-success text-primary-foreground"
                    : item.status === "failed"
                      ? "bg-destructive text-destructive-foreground"
                      : isLocal
                        ? "bg-muted text-muted-foreground"
                        : "bg-card border border-border text-muted-foreground",
                )}
              >
                {item.status === "completed" ? (
                  <CheckIcon width={18} height={18} />
                ) : (
                  <DirIcon width={18} height={18} />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="truncate text-sm font-bold leading-tight"
                    title={sanitizeFilename(item.name)}
                  >
                    {sanitizeFilename(item.name)}
                  </span>
                </div>

                {isTransferring ? (
                  <div className="mt-2.5 space-y-1.5">
                    <Progress
                      value={ratio}
                      tone={item.status === "paused" ? "muted" : "primary"}
                    />
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      <span>
                        {formatBytes(item.bytesTransferred)} / {formatBytes(item.size)}
                      </span>
                      <span aria-hidden>·</span>
                      <span>
                        {item.status === "paused"
                          ? "Paused"
                          : `${formatSpeed(item.speed)}`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span>{formatBytes(item.size)}</span>
                    <span aria-hidden>·</span>
                    <span
                      className={cn(
                        item.status === "failed" &&
                          "text-destructive font-semibold",
                        item.status === "completed" &&
                          "text-success font-semibold",
                      )}
                    >
                      {item.status === "cancelled" &&
                      item.error === "remote_cancel"
                        ? peerName
                          ? `${peerName} aborted`
                          : "Aborted by peer"
                        : item.error && item.error !== "remote_cancel"
                          ? item.error
                          : STATUS_LABEL[item.status]}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-0.5 mt-0.5 ml-1">
                {item.status === "progress" && (
                  <IconButton label="Pause" onClick={() => onPause(item.id)}>
                    <PauseIcon width={18} height={18} />
                  </IconButton>
                )}
                {item.status === "paused" && (
                  <IconButton label="Resume" onClick={() => onResume(item.id)}>
                    <PlayIcon width={18} height={18} />
                  </IconButton>
                )}
                {item.status === "failed" && isLocal && (
                  <IconButton label="Retry" onClick={() => onRetry(item.id)}>
                    <RetryIcon width={18} height={18} />
                  </IconButton>
                )}
                {isTransferring && (
                  <IconButton label="Cancel" onClick={() => onCancel(item.id)}>
                    <CloseIcon width={18} height={18} />
                  </IconButton>
                )}
                {item.status === "completed" && item.blobUrl && (
                  <a
                    href={item.blobUrl}
                    download={sanitizeFilename(item.name)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10"
                    aria-label="Save file"
                    title="Save file"
                  >
                    <DownloadIcon width={18} height={18} />
                  </a>
                )}
              </div>
            </div>
          </div>

          {item.startedAt && (
            <div className="flex items-center gap-1.5 px-1">
              <time
                dateTime={new Date(item.startedAt).toISOString()}
                className="label-mono"
              >
                {formatMsgTime(item.startedAt)}
              </time>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
