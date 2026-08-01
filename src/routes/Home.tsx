import { Link } from "react-router-dom"
import { useSession } from "../state/SessionProvider"
import { NearbyDevices } from "../components/session/NearbyDevices"
import { SessionSurface } from "../components/session/SessionSurface"
import { FilePanel } from "../components/transfer/FilePanel"
import { ConnectionState } from "../state/managers/ConnectionStateManager"
import {
  QrIcon,
  RadarIcon,
  UsersIcon,
  KeyboardIcon,
} from "../components/ui/icons"
import { capabilityService } from "../services/CapabilityService"

export function Home() {
  const { state } = useSession()
  const supported = capabilityService.supportsTransfers()

  // Once a connection is initiated (either direction), take over the screen.
  if (state.connectionState !== ConnectionState.DISCONNECTED)
    return <SessionSurface />

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden px-4 pt-8 pb-12 text-center sm:px-8">
        <div className="relative z-10 max-w-3xl space-y-8">
          <div className="mx-auto flex w-max items-center gap-3">
            <span className="label-mono">Direct transfer · no uploads</span>
            <span className="h-px w-8 bg-border-strong" />
            <Link
              to="/settings"
              className="font-mono text-[10px] uppercase tracking-widest text-primary transition-colors hover:text-primary/80"
            >
              Rename device
            </Link>
          </div>
          <h1 className="text-4xl font-black leading-[0.9] tracking-tighter md:text-6xl lg:text-7xl">
            Pick a device. <br />
            <span className="text-[#cf4322]">Start sending.</span>
          </h1>
        </div>
      </section>

      {!supported && (
        <div className="rounded-2xl border-l-2 border-warning bg-card px-4 py-3 text-sm">
          This browser lacks the WebRTC support required for direct transfer.
          Try a recent Chrome, Edge, Safari, or Firefox.
        </div>
      )}

      <NearbyDevices />

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="label-mono">Not showing up?</span>
          <span className="h-px flex-1 bg-border-strong" />
        </div>
        <div className="grid overflow-hidden rounded-3xl border border-border-strong sm:grid-cols-2">
          <Link
            to="/send"
            className="group flex items-center gap-3 border-b border-border-strong p-5 transition-colors hover:bg-card sm:border-b-0 sm:border-r"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <QrIcon width={20} height={20} />
            </span>
            <div>
              <p className="text-sm font-bold tracking-tight">Share by code</p>
              <p className="text-[12px] text-muted-foreground">
                Generate a QR + pairing code
              </p>
            </div>
            <span className="ml-auto text-muted-foreground transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
          <Link
            to="/join"
            className="group flex items-center gap-3 p-5 transition-colors hover:bg-card"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border-strong">
              <KeyboardIcon width={20} height={20} />
            </span>
            <div>
              <p className="text-sm font-bold tracking-tight">Enter a code</p>
              <p className="text-[12px] text-muted-foreground">
                Join a device by its code
              </p>
            </div>
            <span className="ml-auto text-muted-foreground transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="label-mono">Need to connect multiple devices?</span>
          <span className="h-px flex-1 bg-border-strong" />
        </div>
        <Link
          to="/group"
          className="group flex items-center gap-3 rounded-3xl border border-border-strong p-5 transition-colors hover:bg-card"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
            <UsersIcon width={20} height={20} />
          </span>
          <div>
            <p className="text-sm font-bold tracking-tight">Group Session</p>
            <p className="text-[12px] text-muted-foreground">
              Create or join a room to share with up to 8 devices
            </p>
          </div>
          <span className="ml-auto text-muted-foreground transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      </section>
    </div>
  )
}
