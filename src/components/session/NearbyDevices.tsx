import { useLobby } from "../../state/LobbyProvider"
import { PeerCard } from "./PeerCard"
import { Avatar } from "./Avatar"

/**
 * The discovery surface — an ambient "radar" framing a grid of nearby devices.
 * Click a device to open a session; the other side auto-joins.
 */
export function NearbyDevices() {
  const { devices, connecting, connectTo, thisDevice } = useLobby()
  const empty = devices.length === 0

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="label-mono">Nearby devices</span>
        <span className="h-px flex-1 bg-border" />
        <span className="label-mono">{devices.length} online</span>
      </div>

      <div className="relative overflow-hidden border border-border-strong bg-card">
        {/* Ambient concentric radar rings */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          {[220, 380, 560].map((d, i) => (
            <span
              key={d}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border"
              style={{ width: d, height: d, opacity: 0.5 - i * 0.12 }}
            />
          ))}
          <span
            className="absolute left-1/2 top-1/2 h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border border-primary/25"
            style={{ animationDuration: "3s" }}
          />
        </div>

        <div className="relative p-6 md:p-8">
          {empty ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-border-strong bg-background">
                <span className="h-2 w-2 rounded-full bg-primary" />
              </span>
              <div className="space-y-1.5">
                <p className="text-base font-bold tracking-tight">
                  Looking for devices…
                </p>
                <p className="mx-auto max-w-xs text-[13px] leading-relaxed text-muted-foreground">
                  Open DropSync on another device on the same network — it
                  appears here automatically. No pairing required.
                </p>
              </div>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {devices.map((d) => (
                <li key={d.peerId}>
                  <PeerCard
                    device={d}
                    connecting={connecting === d.peerId}
                    disabled={connecting !== null && connecting !== d.peerId}
                    onConnect={() => void connectTo(d)}
                  />
                </li>
              ))}
            </ul>
          )}

          {/* "You" chip anchored at the base of the radar */}
          <div className="mt-8 flex items-center justify-center">
            <div className="inline-flex items-center gap-2.5 border border-border bg-background px-3 py-2">
              <Avatar
                name={thisDevice.name}
                color={thisDevice.color}
                size={26}
              />
              <span className="text-[13px] font-semibold tracking-tight">
                {thisDevice.name}
              </span>
              <span className="label-mono">you · {thisDevice.platform}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
