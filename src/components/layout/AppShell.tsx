import type { ReactNode } from "react"
import { NavLink, useLocation } from "react-router-dom"
import { ThemeToggle } from "./ThemeToggle"
import { ShieldIcon, HyperSyncLogo } from "../ui/icons"
import { PerformanceOverlay } from "../ui/PerformanceOverlay"
import { cn } from "../../lib/utils"

const nav = [
  { to: "/app", label: "Devices" },
  { to: "/history", label: "History" },
  { to: "/settings", label: "Settings" },
  { to: "/about", label: "About" },
]

function Brand() {
  return (
    <NavLink
      to="/"
      className="flex items-center gap-2 transition-opacity hover:opacity-80"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#cf4322]">
        <HyperSyncLogo className="h-5 w-5 text-black/80" />
      </div>
      <span className="text-[15px] font-black tracking-tight text-black/80">
        Hyper<span className="text-[#cf4322]">Sync</span>
      </span>
    </NavLink>
  )
}

function Nav({ className }: { className?: string }) {
  return (
    <nav className={cn("flex items-center gap-1.5", className)}>
      {nav.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              "relative px-4 py-1.5 text-[13px] font-bold transition-all rounded-full",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const isLanding = location.pathname === "/"

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-2 z-50 mx-auto w-full max-w-[1200px] px-3 md:top-4 md:px-6 lg:px-8">
        <div className="flex h-14 w-full items-center justify-between rounded-full border border-border-strong bg-background/70 px-3 shadow-sm backdrop-blur-xl md:h-[60px] md:px-4">
          <Brand />

          <div className="hidden md:block absolute left-1/2 -translate-x-1/2">
            <Nav />
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <span className="hidden items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-widest text-success lg:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success/70" />
              SYS_OPERATIONAL
            </span>
            <ThemeToggle />
            <a
              href="https://github.com/mosabbir-maruf"
              target="_blank"
              rel="noopener noreferrer"
              title="View Source on GitHub"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
            </a>
          </div>
        </div>

        {/* Mobile row of tabs */}
        <div className="mt-2 mx-auto flex h-12 w-full items-center rounded-full border border-border-strong bg-background/80 px-1.5 shadow-sm backdrop-blur-xl md:hidden">
          <Nav className="w-full justify-between gap-1 [&>a]:flex-1 [&>a]:text-center [&>a]:px-2" />
        </div>
      </header>

      <main
        className={cn(
          "mx-auto w-full",
          !isLanding && "max-w-[1600px] px-4 py-8 md:px-8 md:py-12",
        )}
      >
        {children}
      </main>

      <Footer isNarrow={isLanding || location.pathname === "/about"} />
      <PerformanceOverlay />
    </div>
  )
}

function Footer({ isNarrow }: { isNarrow: boolean }) {
  return (
    <footer className="mt-16 mb-4 w-full">
      <div
        className={cn(
          "mx-auto w-full px-4 md:px-8",
          isNarrow ? "max-w-[1240px]" : "max-w-[1600px]",
        )}
      >
        <div className="w-full overflow-hidden rounded-3xl border border-border-strong bg-background">
          <div className="flex w-full flex-col md:flex-row">
            {/* Brand & Description */}
            <div className="flex flex-1 flex-col justify-between border-b border-border-strong p-6 md:border-b-0 md:border-r md:p-8">
              <div>
                <div className="mb-4 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#cf4322]">
                    <HyperSyncLogo className="h-5 w-5 text-black/80" />
                  </div>
                  <span className="text-[15px] font-black tracking-tight text-black/80">
                    Hyper<span className="text-[#cf4322]">Sync</span>
                  </span>
                </div>
                <p className="max-w-[280px] text-[13px] leading-relaxed text-muted-foreground">
                  Direct peer-to-peer file transfer. No accounts, no uploads,
                  and no cloud copies. Built for speed and absolute privacy.
                </p>
              </div>
              <div className="mt-8 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                © {new Date().getFullYear()} HYPERSYNC
              </div>
            </div>

            {/* Links */}
            <div className="grid flex-[1.5] grid-cols-2 sm:grid-cols-2">
              <div className="flex flex-col gap-4 border-r border-border-strong p-6 md:p-8">
                <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                  Application
                </h4>
                <nav className="flex flex-col gap-3">
                  <NavLink
                    to="/app"
                    className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Devices
                  </NavLink>
                  <NavLink
                    to="/history"
                    className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    History
                  </NavLink>
                  <NavLink
                    to="/settings"
                    className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Settings
                  </NavLink>
                  <NavLink
                    to="/about"
                    className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    About
                  </NavLink>
                </nav>
              </div>

              <div className="col-span-2 flex flex-col justify-between p-6 sm:col-span-1 md:p-8 border-t border-border-strong sm:border-t-0">
                <div>
                  <h4 className="mb-4 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                    System Status
                  </h4>
                  <div className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-widest text-success">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-success/70" />
                    <span>SYS_OPERATIONAL</span>
                  </div>
                </div>

                <div className="mt-8 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <ShieldIcon width={14} height={14} className="text-success" />
                  <span>E2E Encrypted</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
