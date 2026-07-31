import { Button } from "../ui/Button"
import { DownloadIcon } from "../ui/icons"
import type { FileMetadata } from "../../lib/transfer/types"
import { formatBytes, sanitizeFilename } from "../../lib/utils"

/** Prompt shown when the peer offers files, awaiting the local user's decision. */
export function IncomingPrompt({
  files,
  onAccept,
  onReject,
}: {
  files: FileMetadata[]
  onAccept: (ids: string[]) => void
  onReject: (ids: string[]) => void
}) {
  const ids = files.map((f) => f.transferId)
  const total = files.reduce((sum, f) => sum + f.fileSize, 0)

  return (
    <div className="border border-primary">
      <div className="flex items-center gap-3 border-b border-border bg-accent px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center bg-primary text-primary-foreground">
          <DownloadIcon width={17} height={17} />
        </span>
        <div>
          <p className="text-sm font-bold tracking-tight">Incoming transfer</p>
          <p className="label-mono mt-0.5">
            {files.length} file{files.length > 1 ? "s" : ""} ·{" "}
            {formatBytes(total)}
          </p>
        </div>
      </div>
      <ul className="max-h-40 divide-y divide-border overflow-auto px-4">
        {files.map((f) => (
          <li
            key={f.transferId}
            className="flex items-center justify-between py-2.5 text-sm"
          >
            <span className="truncate pr-3">
              {sanitizeFilename(f.fileName)}
            </span>
            <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
              {formatBytes(f.fileSize)}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex gap-px border-t border-border bg-border">
        <Button
          variant="ghost"
          className="flex-1 rounded-none bg-card"
          onClick={() => onReject(ids)}
        >
          Decline
        </Button>
        <Button className="flex-1 rounded-none" onClick={() => onAccept(ids)}>
          Accept & save
        </Button>
      </div>
    </div>
  )
}
