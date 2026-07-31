import { Link } from "react-router-dom"
import { RadarIcon } from "../components/ui/icons"

export function Landing() {
  return (
    <div className="flex flex-col bg-background">
      {/* 1. Hero Section */}
      <section className="relative flex min-h-[calc(100vh-140px)] flex-col border-x border-b border-border-strong lg:flex-row">
        {/* Grid background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.1]"
          style={{
            backgroundImage: `radial-gradient(var(--foreground) 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />

        {/* Left Typography Section */}
        <div className="relative z-10 flex flex-1 flex-col justify-center border-b border-border-strong p-8 lg:border-b-0 lg:border-r lg:p-16 xl:p-24">
          <div className="space-y-10">
            <div className="flex items-center gap-4 font-mono text-xs uppercase tracking-[0.2em] text-primary">
              <span className="flex h-2 w-2 animate-pulse rounded-full bg-primary" />
              <span>Version 2.0 / Local WebRTC</span>
            </div>

            <h1 className="text-6xl font-black leading-[0.95] tracking-tighter sm:text-7xl lg:text-[6rem] xl:text-[7rem]">
              Hyperlocal
              <br />
              file transfer.
            </h1>

            <p className="max-w-lg text-lg font-medium leading-relaxed text-muted-foreground sm:text-xl">
              DropSync uses standard WebRTC data channels to send files directly
              between devices on your network. No servers, no uploads, no
              limits.
            </p>

            <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center">
              <Link
                to="/app"
                className="group relative flex h-14 items-center justify-center overflow-hidden bg-primary px-10 font-mono text-sm font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(234,88,12,0.4)]"
              >
                <span className="relative z-10 flex items-center gap-3">
                  Open Radar
                  <span className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </span>
                {/* Sweep effect on hover */}
                <div className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-500 group-hover:translate-x-full" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Radar Visual */}
        <div className="relative z-0 flex flex-1 items-center justify-center overflow-hidden bg-card p-8 min-h-[500px]">
          {/* Animated Tech Visual */}
          <div className="relative flex h-[320px] w-[320px] items-center justify-center sm:h-[480px] sm:w-[480px]">
            {/* Concentric rotating rings */}
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="absolute rounded-full border border-primary/20"
                style={{
                  width: `${(i + 1) * 25}%`,
                  height: `${(i + 1) * 25}%`,
                  animation: `spin ${20 + i * 10}s linear infinite ${
                    i % 2 === 0 ? "reverse" : "normal"
                  }`,
                  borderStyle: i % 2 === 0 ? "solid" : "dashed",
                }}
              />
            ))}

            {/* Center Node */}
            <div className="absolute flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_40px_rgba(234,88,12,0.5)]">
              <RadarIcon width={28} height={28} className="animate-pulse" />
            </div>

            {/* Connecting lines */}
            <div className="absolute h-[1px] w-[150%] rotate-45 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <div className="absolute h-[1px] w-[150%] -rotate-45 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

            {/* Floating target nodes */}
            <div className="absolute -top-4 right-1/4 flex h-8 w-8 items-center justify-center rounded-full border border-primary bg-background font-mono text-xs text-primary shadow-lg animate-pulse">
              +
            </div>
            <div className="absolute bottom-12 left-1/4 flex h-8 w-8 items-center justify-center rounded-full border border-primary bg-background font-mono text-xs text-primary shadow-lg animate-[pulse_3s_ease-in-out_infinite]">
              +
            </div>
          </div>
        </div>
      </section>

      {/* 2. The Protocol / How it works */}
      <section className="border-x border-b border-border-strong px-8 py-24 lg:px-16 xl:px-24">
        <div className="mx-auto max-w-6xl space-y-16">
          <div className="space-y-4 text-center">
            <h2 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-primary">
              The Protocol
            </h2>
            <h3 className="text-4xl font-black tracking-tight sm:text-5xl">
              How DropSync works.
            </h3>
          </div>

          <div className="grid gap-12 md:grid-cols-3 md:gap-8">
            {[
              {
                step: "01",
                title: "Discover",
                desc: "Open DropSync on any device connected to your local Wi-Fi or LAN. The signaling server helps local devices find each other instantly without accounts.",
              },
              {
                step: "02",
                title: "Pair",
                desc: "Click on a discovered device node. A secure cryptographic handshake establishes a direct WebRTC data channel between the two devices.",
              },
              {
                step: "03",
                title: "Transfer",
                desc: "Select your files. Data flows directly from device to device at the maximum speed your local router allows. No intermediate cloud storage.",
              },
            ].map((s) => (
              <div key={s.step} className="space-y-6">
                <div className="flex h-16 w-16 items-center justify-center border border-border-strong bg-card font-mono text-xl font-bold text-foreground">
                  {s.step}
                </div>
                <div className="space-y-3">
                  <h4 className="text-xl font-bold tracking-tight">
                    {s.title}
                  </h4>
                  <p className="leading-relaxed text-muted-foreground">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Core Features Grid */}
      <section className="grid border-x border-border-strong sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "ZERO INFRASTRUCTURE",
            desc: "The signaling server never touches your actual data payload.",
          },
          {
            title: "UNCAPPED BANDWIDTH",
            desc: "Bypass internet bottlenecks. Speeds are limited only by your local network hardware.",
          },
          {
            title: "PLATFORM AGNOSTIC",
            desc: "Works immediately in any modern browser. macOS, Windows, iOS, Android.",
          },
          {
            title: "NO INSTALLATION",
            desc: "Zero friction. No dedicated apps or extensions required. Just open the URL.",
          },
        ].map((feature, i) => (
          <div
            key={i}
            className={`border-border-strong p-8 lg:p-12 ${
              i !== 3
                ? "border-b lg:border-b-0 lg:border-r"
                : "border-b sm:border-b-0"
            }`}
          >
            <h3 className="mb-3 font-mono text-xs font-bold uppercase tracking-widest text-primary">
              {feature.title}
            </h3>
            <p className="text-sm font-medium leading-relaxed text-muted-foreground lg:text-base">
              {feature.desc}
            </p>
          </div>
        ))}
      </section>

      {/* 4. Final Call to Action */}
      <section className="relative flex min-h-[400px] flex-col items-center justify-center overflow-hidden border-x border-t border-border-strong bg-foreground px-8 py-24 text-center text-background">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage: `radial-gradient(var(--background) 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative z-10 max-w-3xl space-y-8">
          <h2 className="text-5xl font-black tracking-tighter sm:text-7xl">
            Ready to initialize transfer?
          </h2>
          <p className="mx-auto max-w-xl text-lg font-medium text-background/70 sm:text-xl">
            No accounts. No sign-ups. No installation. Just open the radar and
            start sending files instantly.
          </p>
          <div className="pt-4">
            <Link
              to="/app"
              className="inline-flex h-16 items-center justify-center gap-3 bg-primary px-12 font-mono text-base font-bold uppercase tracking-widest text-primary-foreground transition-transform hover:scale-[1.03] active:scale-[0.97]"
            >
              Start Transfer
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
