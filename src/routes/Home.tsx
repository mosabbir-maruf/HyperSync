import { Link } from "react-router-dom"
import { useSession } from "../state/SessionProvider"
import { SessionSurface } from "../components/session/SessionSurface"
import { QrIcon, SendIcon } from "../components/ui/icons"
import { capabilityService } from "../services/CapabilityService"

export function Home() {
  const { state } = useSession()
  const supported = capabilityService.supportsTransfers()

  // Once a connection is initiated (either direction), take over the screen.
  if (state.phase !== "idle") return <SessionSurface />

  return (
    <div className="space-y-10">
      <header className="space-y-5">
        <div className="flex items-center gap-3">
          <span className="label-mono">Direct transfer · no uploads</span>
          <span className="h-px flex-1 bg-border" />
          <Link
            to="/settings"
            className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            Rename device
          </Link>
        </div>
        <h1 className="max-w-2xl text-[2.25rem] font-extrabold leading-[1.03] tracking-tight md:text-5xl">
          Share files instantly.
          <br />
          No uploads required.
        </h1>
      </header>

      {!supported && (
        <div className="border-l-2 border-warning bg-card px-4 py-3 text-sm">
          This browser lacks the WebRTC support required for direct transfer.
          Try a recent Chrome, Edge, Safari, or Firefox.
        </div>
      )}

      <section className="space-y-4">
        <div className="grid border border-border-strong sm:grid-cols-2">
          <Link
            to="/send"
            className="group flex items-center gap-3 border-b border-border-strong p-5 transition-colors hover:bg-card sm:border-b-0 sm:border-r"
          >
            <span className="flex h-10 w-10 items-center justify-center bg-primary text-primary-foreground">
              <SendIcon width={20} height={20} />
            </span>
            <div>
              <p className="text-sm font-bold tracking-tight">Send files</p>
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
            <span className="flex h-10 w-10 items-center justify-center border border-border-strong">
              <QrIcon width={20} height={20} />
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
    </div>
  )
}
