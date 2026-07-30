import { initials } from "../../lib/utils"
import { cn } from "../../lib/utils"

/** Deterministic device avatar: a solid tile with the device's initials. */
export function Avatar({
  name,
  color,
  size = 44,
  className,
}: {
  name: string
  color: string
  size?: number
  className?: string
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center text-white",
        className,
      )}
      style={{ width: size, height: size, backgroundColor: color }}
      aria-hidden
    >
      <span
        className="font-mono font-medium leading-none"
        style={{ fontSize: size * 0.34 }}
      >
        {initials(name)}
      </span>
    </span>
  )
}
