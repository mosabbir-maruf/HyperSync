import { useState, useEffect } from "react"
import { useLobby } from "../../state/LobbyProvider"
import { useSettings } from "../../state/SettingsProvider"
import { PeerCard } from "./PeerCard"
import { Avatar } from "./Avatar"
import { HyperSyncLogo, CheckIcon, CloseIcon } from "../ui/icons"

/**
 * Redesigned Nearby Devices surface.
 * Swiss technical instrument radar aesthetic with live signal scanning beam,
 * tactical telemetry status bar, interactive device nodes (no separate connect button),
 * and an ultra-minimal local transceiver chip with inline rename capability.
 */
export function NearbyDevices() {
  const { devices, connecting, connectTo, thisDevice } = useLobby()
  const { update } = useSettings()
  const empty = devices.length === 0

  const [isEditingName, setIsEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(thisDevice.name)

  useEffect(() => {
    setNameInput(thisDevice.name)
  }, [thisDevice.name])

  const handleSaveName = () => {
    const trimmed = nameInput.trim()
    if (trimmed && trimmed !== thisDevice.name) {
      update({ displayName: trimmed })
    }
    setIsEditingName(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveName()
    } else if (e.key === "Escape") {
      setNameInput(thisDevice.name)
      setIsEditingName(false)
    }
  }

  return (
    <section className="space-y-4">
      {/* Precision Instrument Telemetry Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-strong pb-2.5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-foreground">
            Nearby Devices
          </span>
          <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline-block">
            · LOCAL RADAR LOBBY
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="hidden md:inline">FREQ: 2.4/5 GHz</span>
          <span className="hidden md:inline" aria-hidden>
            |
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            <strong className="font-semibold text-foreground">
              {devices.length}
            </strong>{" "}
            {devices.length === 1 ? "DEVICE ONLINE" : "DEVICES ONLINE"}
          </span>
        </div>
      </div>

      {/* Main Radar Surface Canvas */}
      <div className="relative flex min-h-[480px] flex-col justify-between overflow-hidden rounded-3xl border border-border-strong bg-card shadow-sm md:min-h-[540px] lg:min-h-[600px]">
        {/* Precision hairline grid background pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.12]"
          style={{
            backgroundImage: `radial-gradient(var(--foreground) 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        />

        {/* Ambient Concentric Radar Rings & Rotating Radar Sweep Beam */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          {/* Radar Circles */}
          {[200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2400].map(
            (dim, idx) => (
              <span
                key={dim}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border-strong/40"
                style={{
                  width: dim,
                  height: dim,
                  opacity: Math.max(0.05, 0.45 - idx * 0.05),
                }}
              />
            ),
          )}

          {/* Crosshair Sector Lines */}
          <span className="absolute left-1/2 top-1/2 h-[3000px] w-px -translate-x-1/2 -translate-y-1/2 bg-border-strong/20" />
          <span className="absolute left-1/2 top-1/2 h-px w-[3000px] -translate-x-1/2 -translate-y-1/2 bg-border-strong/20" />

          {/* Animated 360-degree Radar Scanning Beam Sweep */}
          <div
            className="animate-radar-sweep absolute left-1/2 top-1/2 h-[3000px] w-[3000px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, transparent 270deg, var(--primary) 360deg)",
              opacity: 0.05,
            }}
          />
        </div>

        {/* Tactical Corner Bracket Reticles (+) */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-2 top-2 font-mono text-xs font-bold text-border-strong"
        >
          +
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute right-2 top-2 font-mono text-xs font-bold text-border-strong"
        >
          +
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-2 left-2 font-mono text-xs font-bold text-border-strong"
        >
          +
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-2 right-2 font-mono text-xs font-bold text-border-strong"
        >
          +
        </span>

        {/* Content Container */}
        <div className="relative z-10 min-h-[480px] p-6 md:min-h-[540px] md:p-8 lg:min-h-[600px]">
          {empty ? (
            /* Scanning / Empty State view: Perfectly Centered in Radar Field */
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <div className="relative mb-5 flex h-20 w-20 items-center justify-center">
                {/* Outward signal ping pulse */}
                <span
                  aria-hidden
                  className="animate-ping-wave absolute inset-0 rounded-full border border-primary/40"
                />
                <span
                  aria-hidden
                  className="animate-signal-pulse absolute inset-2 rounded-full border border-border-strong bg-background"
                />
                <div className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full bg-[#cf4322] shadow-sm">
                  <HyperSyncLogo className="h-6 w-6 text-black/80 dark:text-white/90" />
                </div>
              </div>

              <div className="max-w-md space-y-2">
                <p className="font-mono text-xs font-semibold uppercase tracking-widest text-primary">
                  SCANNING LOCAL NETWORK…
                </p>
                <h3 className="text-lg font-bold tracking-tight text-foreground">
                  Looking for nearby devices
                </h3>
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  Open HyperSync on another phone, laptop, or tablet on your
                  local network to connect. Devices show up here instantly —
                  click any device to start transferring directly.
                </p>
              </div>

              {/* Status Pill */}
              <div className="mt-6 flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 font-mono text-[10px] text-muted-foreground backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                <span>P2P DISCOVERY ACTIVE</span>
              </div>
            </div>
          ) : (
            /* Discovered Peer Device Cards Grid: Perfectly Centered in Radar Field */
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
              <div className="w-full max-w-3xl space-y-8">
                <div className="flex flex-col items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span>SELECT DEVICE NODE TO CONNECT</span>
                  <span className="opacity-60">· DIRECT WEBRTC SESSION ·</span>
                </div>

                <ul className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
                  {devices.map((d) => (
                    <li key={d.peerId} className="flex">
                      <PeerCard
                        device={d}
                        connecting={connecting === d.peerId}
                        disabled={
                          connecting !== null && connecting !== d.peerId
                        }
                        onConnect={() => void connectTo(d)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Ultra-minimal Local Device Chip ("YOU") with Inline Rename */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center md:bottom-8 lg:bottom-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-1.5 font-mono text-[11px] shadow-xs backdrop-blur">
              <Avatar
                name={thisDevice.name}
                color={thisDevice.color}
                size={18}
              />

              {isEditingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    id="nearby-rename-input"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSaveName}
                    autoFocus
                    className="w-28 rounded-xs border border-primary bg-background px-1.5 py-0.5 text-[11px] font-semibold text-foreground focus:outline-none"
                  />
                  <button
                    type="button"
                    id="nearby-save-btn"
                    onClick={handleSaveName}
                    className="p-0.5 text-success transition-colors hover:text-foreground"
                    title="Save name"
                  >
                    <CheckIcon width={13} height={13} />
                  </button>
                  <button
                    type="button"
                    id="nearby-cancel-btn"
                    onClick={() => {
                      setNameInput(thisDevice.name)
                      setIsEditingName(false)
                    }}
                    className="p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                    title="Cancel"
                  >
                    <CloseIcon width={13} height={13} />
                  </button>
                </div>
              ) : (
                <button
                  id="nearby-edit-btn"
                  onClick={() => setIsEditingName(true)}
                  className="group flex items-center gap-1.5 font-semibold text-foreground transition-colors hover:text-primary"
                  title="Rename device"
                >
                  <span className="max-w-[120px] truncate md:max-w-[160px]">
                    {thisDevice.name}
                  </span>
                  <span className="font-sans text-[10px] tracking-normal text-muted-foreground group-hover:text-primary">
                    (YOU)
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
