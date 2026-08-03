import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CopyIcon,
  CheckIcon,
  HomeIcon,
  RadarIcon,
  SearchIcon,
} from "../components/ui/icons"

interface DestinationLink {
  path: string
  title: string
  code: string
}

interface DestinationCategory {
  category: string
  links: DestinationLink[]
}

const CATEGORIZED_DESTINATIONS: DestinationCategory[] = [
  {
    category: "Available Routing Destinations",
    links: [
      { path: "/app", title: "Connect", code: "01" },
      { path: "/history", title: "History", code: "02" },
      { path: "/settings", title: "Settings", code: "03" },
    ],
  },
  {
    category: "Resources",
    links: [
      { path: "/about", title: "About Us", code: "04" },
      { path: "/about#architecture", title: "Architecture", code: "05" },
      { path: "/about#maker", title: "Maintainer", code: "06" },
      { path: "/about#faq", title: "FAQ", code: "07" },
      { path: "/changelog", title: "Changelog", code: "08" },
    ],
  },
  {
    category: "Legal",
    links: [
      { path: "/about#privacy", title: "Privacy Policy", code: "09" },
      { path: "/about#terms", title: "Terms & Conditions", code: "10" },
    ],
  },
]

export function NotFound() {
  const location = useLocation()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")

  const requestedPath = location.pathname || "/unknown"

  const handleCopyDiagnostic = async () => {
    const report = [
      `[HyperSync Diagnostic Report]`,
      `Timestamp: ${new Date().toISOString()}`,
      `Error Code: ERR_404_SIGNAL_LOST`,
      `Requested URI: ${requestedPath}`,
      `User Agent: ${navigator.userAgent}`,
      `Status: DESTINATION_UNREACHABLE`,
    ].join("\n")

    try {
      await navigator.clipboard.writeText(report)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  const handleRescanSignal = () => {
    if (isScanning) return
    setIsScanning(true)
    setScanProgress(0)

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setTimeout(() => navigate("/app"), 200)
          return 100
        }
        return prev + 25
      })
    }, 150)
  }

  // Filter links based on search query
  const filteredCategories = CATEGORIZED_DESTINATIONS.map((cat) => {
    const filteredLinks = cat.links.filter(
      (item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.path.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    return {
      ...cat,
      links: filteredLinks,
    }
  }).filter((cat) => cat.links.length > 0)

  const totalFilteredCount = filteredCategories.reduce(
    (acc, cat) => acc + cat.links.length,
    0,
  )

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* 1. HERO - Minimal Swiss Technical 404 */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden px-2 pt-6 pb-8 text-center sm:px-8 sm:pt-8 sm:pb-10">
        <div className="relative z-10 w-full max-w-3xl space-y-5 sm:space-y-6">
          {/* Header Status Badge */}
          <div className="mx-auto flex max-w-full items-center gap-2 sm:gap-3 rounded-full border border-border-strong bg-card/60 px-3 py-1 sm:px-4 sm:py-1.5 backdrop-blur-md">
            <span className="h-2 w-2 shrink-0 rounded-full bg-destructive animate-pulse" />
            <span className="label-mono truncate">HyperSync Node</span>
            <span className="h-px w-4 sm:w-6 bg-border-strong shrink-0" />
            <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-destructive font-semibold shrink-0">
              404 // Signal Lost
            </span>
          </div>

          {/* Swiss Minimal Typographic 404 */}
          <div className="py-1 sm:py-2">
            <h1 className="select-none font-mono text-[6.5rem] font-black leading-none tracking-tighter sm:text-[10.5rem] md:text-[13.5rem] lg:text-[16rem] text-foreground/15 dark:text-foreground/10">
              404
            </h1>
          </div>

          <div className="space-y-2.5 sm:space-y-3 max-w-xl mx-auto px-2">
            <h2 className="text-2xl font-black tracking-tighter sm:text-4xl md:text-5xl">
              Page not found.
            </h2>
            <p className="text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">
              The requested route{" "}
              <code className="inline-block max-w-[200px] sm:max-w-none truncate align-bottom rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground border border-border-strong">
                {requestedPath}
              </code>{" "}
              could not be located on this device node.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-2 w-full max-w-sm sm:max-w-none mx-auto px-4">
            <button
              onClick={handleRescanSignal}
              disabled={isScanning}
              className="inline-flex h-12 sm:h-11 items-center justify-center gap-2.5 rounded-full bg-primary px-6 font-mono text-xs font-bold uppercase tracking-wider text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-80 active:scale-[0.98]"
            >
              <RadarIcon
                className={`h-4 w-4 ${isScanning ? "animate-spin" : ""}`}
              />
              <span>
                {isScanning ? `Scanning (${scanProgress}%)` : "Re-Scan Radar"}
              </span>
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </button>

            <Link
              to="/"
              className="inline-flex h-12 sm:h-11 items-center justify-center gap-2 rounded-full border border-border-strong bg-background px-6 font-mono text-xs font-bold uppercase tracking-wider text-foreground transition-all hover:bg-muted active:scale-[0.98]"
            >
              <HomeIcon className="h-4 w-4 text-muted-foreground" />
              Return Home
            </Link>
          </div>
        </div>
      </section>

      {/* 2. MINIMAL DIAGNOSTIC BAR */}
      <section className="bg-background">
        <div className="rounded-2xl border border-border-strong bg-card p-3.5 sm:px-5 sm:py-4 flex items-center justify-between gap-2.5 sm:gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <AlertTriangleIcon className="h-4 w-4 text-destructive shrink-0" />
            <div className="flex items-center gap-x-2 sm:gap-x-4 text-muted-foreground min-w-0">
              <span className="shrink-0">
                STATUS: <strong className="text-destructive">404</strong>
              </span>
              <span className="hidden xs:inline text-border-strong">|</span>
              <span className="truncate max-w-[120px] xs:max-w-[180px] sm:max-w-none">
                URI:{" "}
                <strong className="text-foreground">{requestedPath}</strong>
              </span>
              <span className="hidden md:inline text-border-strong">|</span>
              <span className="hidden md:inline">
                LATENCY: <strong className="text-success">0ms</strong>
              </span>
            </div>
          </div>

          <button
            onClick={handleCopyDiagnostic}
            className="inline-flex items-center gap-1.5 shrink-0 rounded-full border border-border-strong bg-background px-3 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {copied ? (
              <>
                <CheckIcon className="h-3.5 w-3.5 text-success" />
                <span className="text-success font-bold">Copied</span>
              </>
            ) : (
              <>
                <CopyIcon className="h-3.5 w-3.5" />
                <span>Copy Log</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* 3. MINIMAL ROUTING DESTINATIONS DIRECTORY */}
      <section className="bg-background pt-1 sm:pt-2 pb-8">
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-border-strong">
            <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
              <h3 className="text-lg sm:text-xl font-bold tracking-tight">
                Available Routing Destinations
              </h3>
              <span className="label-mono shrink-0">10 ENDPOINTS</span>
            </div>

            <div className="relative w-full sm:w-60">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter destinations..."
                className="w-full rounded-full border border-border-strong bg-card py-2 sm:py-1.5 pl-9 pr-3 text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {totalFilteredCount === 0 ? (
            <div className="py-8 text-center font-mono text-xs text-muted-foreground">
              No matching destinations found.{" "}
              <button
                onClick={() => setSearchQuery("")}
                className="text-primary underline ml-1 font-bold"
              >
                Clear filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 md:gap-10 items-start">
              {filteredCategories.map((section) => (
                <div key={section.category} className="space-y-3 sm:space-y-4">
                  {/* Minimal Category Header */}
                  <div className="flex items-center gap-2 pb-2 border-b border-border-strong">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
                      {section.category}
                    </h4>
                  </div>

                  {/* Clean Links List */}
                  <div className="flex flex-col space-y-1">
                    {section.links.map((route) => (
                      <Link
                        key={route.path}
                        to={route.path}
                        className="group flex items-center justify-between py-2.5 sm:py-2 px-3 rounded-lg transition-colors hover:bg-muted active:bg-muted/80"
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                          <span className="font-mono text-[11px] font-bold text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                            {route.code}
                          </span>
                          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                            {route.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="font-mono text-[11px] text-muted-foreground group-hover:text-foreground transition-colors hidden sm:inline">
                            {route.path}
                          </span>
                          <ArrowRightIcon className="h-3.5 w-3.5 opacity-60 sm:opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
