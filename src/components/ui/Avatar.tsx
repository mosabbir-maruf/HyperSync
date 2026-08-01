import { avatarColor, initials, getMarvelAvatarUrl } from "../../lib/utils"
import { cn } from "../../lib/utils"

interface AvatarProps {
  name: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function Avatar({ name, size = "md", className }: AvatarProps) {
  const display = name || "Unknown"
  const url = getMarvelAvatarUrl(display)
  const bg = avatarColor(display)
  const letters = initials(display)

  const sizeClasses = {
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-xs",
    lg: "h-10 w-10 text-sm",
  }

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        sizeClasses[size],
        className,
      )}
      style={!url ? { backgroundColor: bg } : undefined}
      aria-label={`Avatar for ${display}`}
    >
      {url ? (
        <img
          src={url}
          alt={display}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className="font-semibold text-white/90 uppercase">{letters}</span>
      )}
    </div>
  )
}
