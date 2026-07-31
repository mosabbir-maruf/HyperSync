import type { ReactNode } from "react"
import { NavLink, useLocation } from "react-router-dom"
import { ThemeToggle } from "./ThemeToggle"
import { ShieldIcon, HyperSyncLogo } from "../ui/icons"
import { PerformanceOverlay } from "../ui/PerformanceOverlay"
import { cn } from "../../lib/utils"

const nav = [
  { to: "/app", label: "Devices", end: false },
  { to: "/history", label: "History", end: false },
  { to: "/settings", label: "Settings", end: false },
]

function Brand() {
  return (
    <NavLink to="/" className="flex items-center gap-2.5">
      <HyperSyncLogo className="h-7 w-7 text-primary drop-shadow-[0_0_8px_rgba(234,88,12,0.4)]" />
      <span className="text-[16px] font-extrabold tracking-tight">
        HyperSync
      </span>
    </NavLink>
  )
}

function Nav({ className }: { className?: string }) {
  return (
    <nav className={cn("flex items-center gap-1", className)}>
      {nav.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              "relative px-3 py-1.5 text-[13px] font-medium transition-colors",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )
          }
        >
          {({ isActive }) => (
            <>
              {label}
              <span
                className={cn(
                  "absolute inset-x-3 -bottom-px h-0.5 bg-primary transition-opacity",
                  isActive ? "opacity-100" : "opacity-0",
                )}
              />
            </>
          )}
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
      <header className="sticky top-0 z-50 border-b border-border-strong bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-4 px-4 md:px-8">
          <Brand />
          <Nav className="ml-4 hidden md:flex" />
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
        {/* Mobile row of tabs beneath the brand */}
        <div className="mx-auto flex w-full max-w-[1600px] items-center border-t border-border px-2 md:hidden">
          <Nav className="w-full justify-around" />
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

      <Footer />
      <PerformanceOverlay />
    </div>
  )
}

function Footer() {
  return (
    <footer className="mt-16 mb-4 w-full">
      <div className="mx-auto w-full max-w-[1600px] px-4 md:px-8">
        <div className="w-full overflow-hidden rounded-3xl border border-border-strong bg-background">
          <div className="flex w-full flex-col md:flex-row">
            {/* Brand & Description */}
            <div className="flex flex-1 flex-col justify-between border-b border-border-strong p-6 md:border-b-0 md:border-r md:p-8">
              <div>
                <div className="mb-4 flex items-center gap-2.5">
                  <HyperSyncLogo className="h-6 w-6 text-primary drop-shadow-[0_0_8px_rgba(234,88,12,0.4)]" />
                  <span className="text-[16px] font-extrabold tracking-tight">
                    HyperSync
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
