import { useEffect, useRef, type ReactNode } from "react"
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"
import { useSession } from "../../state/SessionProvider"
import { ConnectionState } from "../../state/managers/ConnectionStateManager"
import { ThemeToggle } from "./ThemeToggle"
import { ShieldIcon, HyperSyncLogo } from "../ui/icons"

import { cn } from "../../lib/utils"

const nav: { to: string; label: string; end?: boolean }[] = [
  { to: "/app", label: "Connect" },
  { to: "/history", label: "History" },
  { to: "/settings", label: "Settings" },
  { to: "/about", label: "About" },
  { to: "/changelog", label: "Changelog" },
]

function Brand() {
  return (
    <NavLink
      to="/"
      className="flex items-center gap-2 transition-opacity hover:opacity-80"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#cf4322]">
        <HyperSyncLogo className="h-5 w-5 text-black/80 dark:text-white/90" />
      </div>
      <span className="text-[15px] font-black tracking-tight text-black/80 dark:text-white/90">
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
  const navigate = useNavigate()
  const { state: sessionState } = useSession()
  const isLanding = location.pathname === "/"

  const prevConnRef = useRef(sessionState.connectionState)

  // Automatically navigate to the session view ONLY when a connection initially starts.
  useEffect(() => {
    const isNowConnected = sessionState.connectionState !== ConnectionState.DISCONNECTED
    const wasDisconnected = prevConnRef.current === ConnectionState.DISCONNECTED

    if (isNowConnected && wasDisconnected) {
      const isSessionRoute = ["/app", "/send", "/join"].includes(location.pathname)
      const isGroupRoute = location.pathname.startsWith("/group")
      
      if (!isSessionRoute && !isGroupRoute) {
        navigate("/app")
      }
    }

    prevConnRef.current = sessionState.connectionState
  }, [sessionState.connectionState, location.pathname, navigate])

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-2 z-50 mx-auto w-full max-w-5xl px-4 md:top-4 md:px-8">
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
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary transition-opacity hover:opacity-80"
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

        <div className="mt-2 mx-auto flex h-12 w-full items-center rounded-full border border-border-strong bg-background/80 px-1.5 shadow-sm backdrop-blur-xl md:hidden">
          <Nav className="w-full justify-between gap-1 [&>a]:flex-1 [&>a]:text-center [&>a]:px-2" />
        </div>
      </header>

      <main
        className={cn(
          "mx-auto w-full",
          !isLanding && "max-w-[1273px] px-6 py-8 md:px-12 md:py-12",
        )}
      >
        {children}
      </main>

      <Footer />
    </div>
  )
}

function Footer() {
  return (
    <footer className="mt-16 pb-12 md:pb-8 w-full">
      <div className="mx-auto w-full max-w-[1273px] px-6 md:px-12">
        <div className="w-full overflow-hidden rounded-3xl border border-border-strong bg-background">
          <div className="flex w-full flex-col md:flex-row">
            {/* Brand & Description */}
            <div className="flex flex-[1.5] flex-col justify-between border-b border-border-strong p-4 sm:p-6 md:border-b-0 md:border-r md:p-8">
              <div>
                <div className="mb-4 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#cf4322]">
                    <HyperSyncLogo className="h-5 w-5 text-black/80 dark:text-white/90" />
                  </div>
                  <span className="text-[15px] font-black tracking-tight text-black/80 dark:text-white/90">
                    Hyper<span className="text-[#cf4322]">Sync</span>
                  </span>
                </div>
                <p className="max-w-[280px] text-[13px] leading-relaxed text-muted-foreground">
                  Direct peer-to-peer file transfer. No accounts, no uploads,
                  and no cloud copies. Built for speed and absolute privacy.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-widest text-success">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-success/70" />
                    <span>SYS_OPERATIONAL</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-widest text-success">
                    <ShieldIcon width={12} height={12} />
                    <span>E2E Encrypted</span>
                  </div>
                </div>
              </div>
              <div className="mt-8 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                © {new Date().getFullYear()} HYPERSYNC
              </div>
            </div>

            {/* Links */}
            <div className="grid flex-[2.5] grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col gap-4 border-r border-b border-border-strong lg:border-b-0 p-4 sm:p-6 md:p-8">
                <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                  Application
                </h4>
                <nav className="flex flex-col gap-3">
                  <NavLink
                    to="/app"
                    className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Connect
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

              <div className="flex flex-col gap-4 border-b border-border-strong lg:border-b-0 lg:border-r p-4 sm:p-6 md:p-8">
                <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                  Resources
                </h4>
                <nav className="flex flex-col gap-3">
                  <NavLink
                    to="/about"
                    className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    About Us
                  </NavLink>
                  <Link
                    to="/about#architecture"
                    className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Architecture
                  </Link>
                  <Link
                    to="/about#maker"
                    className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Maintainer
                  </Link>
                  <Link
                    to="/about#faq"
                    className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    FAQ
                  </Link>
                  <NavLink
                    to="/changelog"
                    className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Changelog
                  </NavLink>
                </nav>
              </div>

              <div className="col-span-2 flex flex-col gap-4 p-4 sm:p-6 lg:col-span-1 md:p-8">
                <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                  Legal
                </h4>
                <nav className="flex flex-col gap-3">
                  <Link
                    to="/about#privacy"
                    className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Privacy Policy
                  </Link>
                  <Link
                    to="/about#terms"
                    className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Terms & Conditions
                  </Link>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
