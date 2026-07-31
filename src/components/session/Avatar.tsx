import { getMarvelAvatarUrl, initials } from "../../lib/utils"
import { cn } from "../../lib/utils"

/** Deterministic device avatar: a solid tile with the device's initials or a custom image. */
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
  const avatarUrl = getMarvelAvatarUrl(name)

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        draggable={false}
        className={cn(
          "shrink-0 select-none pointer-events-none rounded-full object-cover",
          className,
        )}
        style={{ width: size, height: size, backgroundColor: color }}
      />
    )
  }

  return (
    <span
      className={cn(
        "flex shrink-0 select-none pointer-events-none items-center justify-center rounded-full text-white",
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
