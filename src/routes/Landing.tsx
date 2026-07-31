import { Link } from "react-router-dom"
import {
  RadarIcon,
  ShieldIcon,
  BoltIcon,
  MonitorIcon,
  LinkIcon,
} from "../components/ui/icons"

export function Landing() {
  return (
    <div className="flex flex-col">
      {/* 1. HERO - Swiss Technical */}
      <section className="relative flex min-h-[85vh] flex-col items-center justify-center overflow-hidden px-4 py-32 text-center sm:px-8">
        <div className="relative z-10 max-w-4xl space-y-10">
          <div className="mx-auto flex w-max items-center gap-3">
            <span className="label-mono">HyperSync v2.0</span>
            <span className="h-px w-8 bg-border" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
              Local WebRTC
            </span>
          </div>

          <h1 className="text-[4rem] font-black leading-[0.9] tracking-tighter md:text-[6rem] lg:text-[7.5rem]">
            Direct transfer. <br />
            <span className="text-muted-foreground">No uploads.</span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg font-medium leading-relaxed text-muted-foreground sm:text-xl">
            Engineered for the absolute shortest path between two devices. Files
            stream directly from memory to memory over your local network.
          </p>

          <div className="flex justify-center pt-4">
            <Link
              to="/app"
              className="group flex h-14 items-center gap-4 rounded-full border border-border-strong bg-card pl-6 pr-2 transition-colors hover:bg-muted"
            >
              <span className="font-bold uppercase tracking-tight">
                Initialize Radar
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:scale-105">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. THE PROTOCOL - Swiss Grid */}
      <section className="bg-background py-24 md:py-32">
        <div className="mx-auto max-w-[1200px] px-6 md:px-12">
          <div className="mb-12 flex items-center gap-6 md:mb-20">
            <h2 className="text-3xl font-black tracking-tighter md:text-5xl">
              The Protocol
            </h2>
            <span className="h-px flex-1 bg-border-strong" />
          </div>

          <div className="grid gap-px overflow-hidden rounded-3xl border border-border-strong bg-border-strong sm:grid-cols-2">
            {[
              {
                title: "Zero Infrastructure",
                desc: "Your data never touches a server. The signaling hub only introduces devices, then immediately gets out of the way for a pure peer-to-peer connection.",
                icon: <ShieldIcon width={24} height={24} />,
              },
              {
                title: "Uncapped Bandwidth",
                desc: "Bypass internet bottlenecks. Files stream directly over your local Wi-Fi or LAN at the absolute maximum speed your router can handle.",
                icon: <BoltIcon width={24} height={24} />,
              },
              {
                title: "Platform Agnostic",
                desc: "macOS, Windows, Linux, iOS, Android. As long as it has a modern web browser, it can send and receive files seamlessly.",
                icon: <MonitorIcon width={24} height={24} />,
              },
              {
                title: "No Installation",
                desc: "Zero friction. No apps to download, no accounts to create, no permissions to grant. Just open the URL and start transferring.",
                icon: <LinkIcon width={24} height={24} />,
              },
            ].map((feature, i) => (
              <div key={i} className="group bg-background p-8 md:p-12">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-border-strong bg-card text-foreground">
                  {feature.icon}
                </div>
                <h3 className="mb-3 text-xl font-bold tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS */}
      <section className="bg-background py-24 md:py-32">
        <div className="mx-auto max-w-[1200px] px-6 md:px-12">
          <div className="mb-12 flex items-center gap-6 md:mb-20">
            <span className="h-px flex-1 bg-border-strong" />
            <h2 className="text-3xl font-black tracking-tighter md:text-5xl">
              How it Works
            </h2>
          </div>

          <div className="grid gap-px overflow-hidden rounded-3xl border border-border-strong bg-border-strong sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Discover",
                desc: "Both devices open the app on the same local network.",
              },
              {
                step: "02",
                title: "Pair",
                desc: "A secure WebRTC cryptographic handshake is established.",
              },
              {
                step: "03",
                title: "Transfer",
                desc: "Files stream directly from memory to memory.",
              },
            ].map((s) => (
              <div key={s.step} className="bg-background p-8 md:p-12">
                <div className="mb-8 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                  Step {s.step}
                </div>
                <h3 className="mb-3 text-2xl font-black tracking-tight">
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Final Call to Action */}
      <section className="bg-background py-24 md:py-32">
        <div className="mx-auto max-w-[1200px] px-6 md:px-12">
          <div className="relative overflow-hidden rounded-3xl border border-border-strong bg-background px-8 py-20 text-center md:py-24">
            {/* ambient glow */}
            <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-[120px]" />
            {/* corner ticks */}
            <span className="absolute left-4 top-4 h-2 w-2 border-l border-t border-border-strong" />
            <span className="absolute right-4 top-4 h-2 w-2 border-r border-t border-border-strong" />
            <span className="absolute bottom-4 left-4 h-2 w-2 border-b border-l border-border-strong" />
            <span className="absolute bottom-4 right-4 h-2 w-2 border-b border-r border-border-strong" />

            <div className="relative z-10 mx-auto max-w-3xl space-y-8">
              <h2 className="text-4xl font-black tracking-tighter text-foreground sm:text-5xl md:text-6xl">
                Ready to initialize <br /> transfer?
              </h2>
              <p className="mx-auto max-w-xl text-lg text-muted-foreground">
                No accounts. No sign-ups. No installation. Just open the radar
                and start sending files instantly.
              </p>
              <div className="flex justify-center pt-8">
                <Link
                  to="/app"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 font-mono text-sm font-bold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
                >
                  Start Transfer &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
