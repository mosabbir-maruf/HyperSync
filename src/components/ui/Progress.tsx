import { cn } from "../../lib/utils"

interface ProgressProps {
  value: number // 0..1
  className?: string
  tone?: "primary" | "success" | "muted"
}

const tones = {
  primary: "bg-primary",
  success: "bg-success",
  muted: "bg-muted-foreground",
}

export function Progress({
  value,
  className,
  tone = "primary",
}: ProgressProps) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      className={cn(
        "h-1 w-full overflow-hidden rounded-full bg-secondary",
        className,
      )}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full transition-[width] duration-150", tones[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
