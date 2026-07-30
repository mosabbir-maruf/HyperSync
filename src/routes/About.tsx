import { ShieldIcon, BoltIcon, RadarIcon } from "../components/ui/icons"
import type { ReactNode } from "react"

export function About() {
  return (
    <div className="space-y-10">
      <header className="space-y-5">
        <div className="flex items-center gap-3">
          <span className="label-mono">About</span>
          <span className="h-px flex-1 bg-border" />
          <span className="label-mono">v1.0</span>
        </div>
        <h1 className="text-[2rem] font-extrabold leading-[1.05] tracking-tight md:text-4xl">
          File transfer that
          <br />
          stays between devices.
        </h1>
        <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          DropSync moves files straight from one device to another over an
          encrypted WebRTC channel. There is no account, no upload, and no cloud
          copy — the network only helps two devices discover and connect to each
          other.
        </p>
      </header>

      <section className="grid gap-px border border-border bg-border sm:grid-cols-3">
        <Feature icon={<RadarIcon width={20} height={20} />} title="Discover">
          Devices on the same network appear automatically. Tap one to connect —
          no codes to type unless you want to.
        </Feature>
        <Feature icon={<BoltIcon width={20} height={20} />} title="Transfer">
          Files stream in small chunks with live progress, pause, resume, and
          retry. Large files never load fully into memory.
        </Feature>
        <Feature icon={<ShieldIcon width={20} height={20} />} title="Private">
          Bytes flow peer-to-peer. The signaling backend only relays connection
          setup — it never sees your files.
        </Feature>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="label-mono">How it works</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <ol className="space-y-px border border-border bg-border">
          {[
            [
              "Signaling",
              "A lightweight backend exchanges connection details (SDP + ICE) so two browsers can find a direct path to each other.",
            ],
            [
              "Peer connection",
              "The browsers open a direct RTCPeerConnection and a data channel — no server sits in the middle of the data.",
            ],
            [
              "Transfer",
              "Files are sliced into chunks and streamed over the channel with backpressure, so buffers never overflow.",
            ],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-4 bg-card px-4 py-4">
              <span className="font-mono text-xs text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="space-y-1">
                <p className="text-sm font-bold tracking-tight">{t}</p>
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {d}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <p className="border-l-2 border-border-strong pl-4 text-[12px] leading-relaxed text-muted-foreground">
        DropSync is browser-first and installs nothing. It works across macOS,
        Windows, Linux, ChromeOS, iOS, and Android in any modern browser with
        WebRTC support.
      </p>
    </div>
  )
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <div className="space-y-3 bg-card p-5">
      <span className="flex h-10 w-10 items-center justify-center border border-border-strong text-primary">
        {icon}
      </span>
      <p className="text-base font-bold tracking-tight">{title}</p>
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        {children}
      </p>
    </div>
  )
}
