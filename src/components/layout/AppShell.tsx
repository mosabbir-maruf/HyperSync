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
    <footer className="mt-8 border-t border-border-strong">
      <div className="mx-auto grid w-full max-w-[1600px] gap-6 px-4 py-8 md:grid-cols-[1.4fr_1fr] md:px-8">
        <div className="flex items-start gap-3">
          <ShieldIcon
            width={18}
            height={18}
            className="mt-0.5 shrink-0 text-success"
          />
          <div className="space-y-1">
            <p className="text-[13px] font-semibold tracking-tight">
              Private by design
            </p>
            <p className="max-w-sm text-[12px] leading-relaxed text-muted-foreground">
              Files transfer directly between devices over an encrypted
              peer-to-peer channel. Their contents never touch HyperSync servers
              — the backend only helps devices find each other.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:items-end">
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            {[
              { to: "/about", label: "About" },
              { to: "/settings", label: "Settings" },
              { to: "/history", label: "History" },
            ].map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-widest text-success">
            <span className="flex h-1.5 w-1.5 rounded-full bg-success/70" />
            <span>SYS_OPERATIONAL</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
