import { useState } from "react"
import { SendIcon } from "../ui/icons"
import { cn } from "../../lib/utils"
import { storageProvider } from "../../browser/FileSelectionService"

/** File picker + drag-and-drop surface. Hands raw File[] up; never buffers them. */
export function DropZone({
  onFiles,
  disabled,
}: {
  onFiles: (files: File[]) => void
  disabled?: boolean
}) {
  const [dragging, setDragging] = useState(false)

  const selectFiles = async () => {
    if (disabled) return
    const selection = await storageProvider.pick({ multiple: true })
    if (selection.files.length > 0) onFiles([...selection.files])
  }

  return (
    <div
      onDragOver={(e) => {
        if (disabled) return
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (!disabled) {
          const selection = storageProvider.fromDrop(e.dataTransfer)
          if (selection.files.length > 0) onFiles([...selection.files])
        }
      }}
      onPaste={(e) => {
        if (disabled) return
        const selection = storageProvider.fromPaste(e.clipboardData)
        if (selection.files.length > 0) onFiles([...selection.files])
      }}
      tabIndex={0}
      aria-label="Choose, paste, or drop files to send"
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed px-6 py-14 text-center transition-colors",
        dragging ? "border-primary bg-accent" : "border-border-strong bg-card",
        disabled && "opacity-50",
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
        <SendIcon width={22} height={22} />
      </span>
      <div className="space-y-1">
        <p className="text-[15px] font-bold tracking-tight">
          Drop files to send
        </p>
        <p className="label-mono">or select from this device</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => void selectFiles()}
        className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-all hover:bg-[color-mix(in_srgb,var(--primary)_88%,#000)] disabled:pointer-events-none disabled:opacity-50"
      >
        Choose files
      </button>
    </div>
  )
}
