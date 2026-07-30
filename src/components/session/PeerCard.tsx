import { Avatar } from "./Avatar"
import type { DevicePresence } from "../../lib/signaling"
import { cn } from "../../lib/utils"

/**
 * A single discoverable device, presented as a generous tappable card.
 * Pure presentation — click handling and state live in the lobby feature.
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
      disabled={disabled}
      onClick={onConnect}
      className={cn(
        "group relative flex flex-col items-center gap-4 border border-border bg-card p-6 text-center transition-all duration-200",
        disabled
          ? "opacity-40"
          : "hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_0_0_1px_var(--primary)]",
      )}
    >
      {/* presence dot */}
      <span className="absolute right-3 top-3 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
      </span>

      <span className="relative">
        <span
          className="absolute -inset-1.5 border border-border transition-colors group-hover:border-primary/40"
          aria-hidden
        />
        <Avatar name={device.name} color={device.color} size={60} />
      </span>

      <div className="space-y-1.5">
        <p className="text-[15px] font-bold leading-tight tracking-tight">
          {device.name}
        </p>
        <p className="label-mono">{device.platform}</p>
      </div>

      <span
        className={cn(
          "mt-1 inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors",
          connecting
            ? "bg-primary text-primary-foreground"
            : "border border-border-strong text-muted-foreground group-hover:border-primary group-hover:text-primary",
        )}
      >
        {connecting ? "Linking…" : "Connect"}
      </span>
    </button>
  )
}
