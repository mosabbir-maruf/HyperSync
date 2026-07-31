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

interface Props {
  item: TransferItem
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

export function TransferRow({
  item,
  onPause,
  onResume,
  onCancel,
  onRetry,
}: Props) {
  const ratio = item.size > 0 ? item.bytesTransferred / item.size : 0
  const isTransferring = item.status === "progress" || item.status === "paused"
  const DirIcon = item.direction === "send" ? SendIcon : ReceiveIcon

  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card px-4 py-3">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          item.status === "completed"
            ? "bg-success text-primary-foreground"
            : item.status === "failed"
              ? "bg-destructive text-destructive-foreground"
              : "border border-border-strong text-muted-foreground",
        )}
      >
        {item.status === "completed" ? (
          <CheckIcon width={17} height={17} />
        ) : (
          <DirIcon width={16} height={16} />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className="truncate text-sm font-semibold"
            title={sanitizeFilename(item.name)}
          >
            {sanitizeFilename(item.name)}
          </span>
          <span className="label-mono shrink-0">{item.direction}</span>
        </div>

        {isTransferring ? (
          <div className="mt-2 space-y-1.5">
            <Progress
              value={ratio}
              tone={item.status === "paused" ? "muted" : "primary"}
            />
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>
                {formatBytes(item.bytesTransferred)} / {formatBytes(item.size)}
              </span>
              <span>
                {item.status === "paused"
                  ? "Paused"
                  : `${formatSpeed(item.speed)} · ${formatDuration(item.eta ?? Infinity)}`}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>{formatBytes(item.size)}</span>
            <span aria-hidden>·</span>
            <span
              className={cn(
                item.status === "failed" && "text-destructive",
                item.status === "completed" && "text-success",
              )}
            >
              {item.error ?? STATUS_LABEL[item.status]}
            </span>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {item.status === "progress" && item.direction === "send" && (
          <IconButton label="Pause" onClick={() => onPause(item.id)}>
            <PauseIcon width={17} height={17} />
          </IconButton>
        )}
        {item.status === "paused" && (
          <IconButton label="Resume" onClick={() => onResume(item.id)}>
            <PlayIcon width={17} height={17} />
          </IconButton>
        )}
        {item.status === "failed" && item.direction === "send" && (
          <IconButton label="Retry" onClick={() => onRetry(item.id)}>
            <RetryIcon width={17} height={17} />
          </IconButton>
        )}
        {isTransferring && (
          <IconButton label="Cancel" onClick={() => onCancel(item.id)}>
            <CloseIcon width={17} height={17} />
          </IconButton>
        )}
        {item.status === "completed" && item.blobUrl && (
          <a
            href={item.blobUrl}
            download={sanitizeFilename(item.name)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-primary transition-colors hover:bg-secondary"
            aria-label="Save file"
            title="Save file"
          >
            <DownloadIcon width={18} height={18} />
          </a>
        )}
      </div>
    </div>
  )
}
