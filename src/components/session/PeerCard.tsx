import { Avatar } from "./Avatar"
import type { DevicePresence } from "../../lib/signaling"
import { cn } from "../../lib/utils"

/**
 * Tactical platform icons fitting the Swiss technical instrument design aesthetic.
 */
function PlatformIcon({ platform }: { platform: string }) {
  const p = platform.toLowerCase()
  if (p.includes("mac")) {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    )
  }
  if (p.includes("android")) {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="6" y="2" width="12" height="20" rx="2.5" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    )
  }
  if (p.includes("ios") || p.includes("iphone") || p.includes("ipad")) {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="6" y="2" width="12" height="20" rx="2.5" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    )
  }
  if (p.includes("win")) {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 4l8-1v8.5H3V4zM12 3l9-1.5v9.5H12V3zM3 12.5h8V21l-8-1v-7.5zM12 12.5h9V22l-9-1.5v-8z" />
      </svg>
    )
  }
  if (p.includes("linux")) {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 15a3 3 0 003-3H9a3 3 0 003 3z" />
      </svg>
    )
  }
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 014-10z" />
    </svg>
  )
}

/**
 * Floating Radar Target Node.
 * No box/card container — pure spatial radar target node floating on the radar canvas.
 * Clicking ANYWHERE on the node initiates connection.
 */
export function PeerCard({
  device,
  connecting,
  disabled,
  onConnect,
}: {
  device: DevicePresence
  connecting: boolean
  disabled: boolean
  onConnect: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onConnect}
      className={cn(
        "group relative flex w-full flex-col items-center justify-center p-5 text-center transition-all duration-200 focus:outline-none",
        disabled ? "cursor-not-allowed opacity-30" : "cursor-pointer",
      )}
    >
      {/* Top Floating Badge: Status Beacon + Platform */}
      <div className="mb-3 flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground backdrop-blur transition-all duration-200 group-hover:border-primary/50 group-hover:text-foreground">
        <span className="relative flex h-1.5 w-1.5 items-center justify-center">
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full opacity-75",
              connecting
                ? "animate-ping bg-primary"
                : "animate-pulse bg-success",
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-1.5 w-1.5 rounded-full",
              connecting ? "bg-primary" : "bg-success",
            )}
          />
        </span>
        <PlatformIcon platform={device.platform} />
        <span className="uppercase tracking-wider">{device.platform}</span>
      </div>

      {/* Floating Circular Radar Node Target with Reticle Halo */}
      <div className="relative my-1 flex items-center justify-center">
        {/* Reticle Target Ring */}
        <span
          aria-hidden
          className={cn(
            "absolute -inset-2.5 rounded-full border transition-all duration-300",
            connecting
              ? "animate-spin-slow border-2 border-dashed border-primary"
              : "border-border-strong/40 group-hover:scale-110 group-hover:border-primary group-hover:bg-primary/5",
          )}
        />

        {/* Tactical Crosshair Ticks (+) on Hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-4 font-mono text-[9px] text-primary opacity-0 transition-all duration-200 group-hover:translate-y-0.5 group-hover:opacity-100"
        >
          +
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-4 font-mono text-[9px] text-primary opacity-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:opacity-100"
        >
          +
        </span>

        {/* Node Circular Avatar */}
        <Avatar
          name={device.name}
          color={device.color}
          size={44}
          className="rounded-full shadow-sm transition-transform duration-200 group-hover:scale-105"
        />
      </div>

      {/* Floating Node Label */}
      <div className="mt-2.5 space-y-0.5">
        <p className="text-[14px] font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
          {device.name}
        </p>
        {connecting ? (
          <span className="block font-mono text-[9px] font-semibold uppercase text-primary animate-pulse">
            LINKING…
          </span>
        ) : (
          <span className="block font-mono text-[9px] uppercase tracking-wider text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            TAP TO CONNECT
          </span>
        )}
      </div>
    </button>
  )
}
