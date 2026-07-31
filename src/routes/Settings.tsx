import { useSettings } from "../state/SettingsProvider"
import { useTheme, type ThemePreference } from "../state/ThemeProvider"
import { useHistory } from "../state/history"
import { capabilityService } from "../services/CapabilityService"
import { Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { cn } from "../lib/utils"
import type { ReactNode } from "react"

function Row({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        checked ? "bg-primary" : "bg-secondary border-border-strong",
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full shadow-lg transition-transform",
          checked
            ? "translate-x-5 bg-primary-foreground"
            : "translate-x-0 bg-muted-foreground",
        )}
      />
    </button>
  )
}

export function Settings() {
  const { settings, update } = useSettings()
  const { preference, setPreference } = useTheme()
  const { clear } = useHistory()
  const caps = capabilityService.get()

  const themes: { value: ThemePreference label: string }[] = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
  ]

  return (
    <div className="space-y-10">
      <header className="space-y-5">
        <div className="flex items-center gap-3">
          <span className="label-mono">System configuration</span>
          <span className="h-px flex-1 bg-border-strong" />
        </div>
        <h1 className="text-4xl font-black tracking-tighter md:text-6xl lg:text-7xl">
          Settings. <span className="text-[#cf4322]">Local device.</span>
        </h1>
      </header>

      <section className="space-y-2">
        <h2 className="label-mono px-1">Identity</h2>
        <Card className="divide-y divide-border">
          <Row
            title="Display name"
            description="Shown to peers you connect with."
          >
            <input
              value={settings.displayName}
              onChange={(e) => update({ displayName: e.target.value })}
              className="h-9 w-44 rounded-sm border border-border-strong bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Row>
        </Card>
      </section>

      <section className="space-y-2">
        <h2 className="label-mono px-1">Appearance</h2>
        <Card className="divide-y divide-border">
          <Row title="Theme">
            <div className="inline-flex overflow-hidden rounded-full border border-border-strong">
              {themes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setPreference(t.value)}
                  className={cn(
                    "border-r border-border px-3 py-1.5 text-[13px] font-medium transition-colors last:border-r-0",
                    preference === t.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Row>
        </Card>
      </section>

      <section className="space-y-2">
        <h2 className="label-mono px-1">Transfers</h2>
        <Card className="divide-y divide-border">
          <Row
            title="Auto-accept incoming"
            description="Skip the confirmation prompt for files sent to this device."
          >
            <Toggle
              checked={settings.autoAccept}
              onChange={(v) => update({ autoAccept: v })}
            />
          </Row>
          <Row
            title="Keep local history"
            description="Remember transfer metadata on this device."
          >
            <Toggle
              checked={settings.keepHistory}
              onChange={(v) => update({ keepHistory: v })}
            />
          </Row>
          <Row title="Sound on completion">
            <Toggle
              checked={settings.soundOnComplete}
              onChange={(v) => update({ soundOnComplete: v })}
            />
          </Row>
        </Card>
      </section>

      <section className="space-y-2">
        <h2 className="label-mono px-1">Environment</h2>
        <Card className="divide-y divide-border">
          <Row
            title="Signaling"
            description="How devices discover each other to connect."
          >
            <span className="font-mono text-[12px] text-muted-foreground">
              in-memory mock
            </span>
          </Row>
          <Row
            title="Streaming download"
            description="Write received files straight to disk."
          >
            <span className="font-mono text-[12px] text-muted-foreground">
              {caps.streamingDownload ? "supported" : "blob fallback"}
            </span>
          </Row>
          <Row title="Platform">
            <span className="font-mono text-[12px] text-muted-foreground">
              {caps.isIOS ? "iOS" : caps.isAndroid ? "Android" : "desktop"}
            </span>
          </Row>
        </Card>
      </section>

      <section className="space-y-2">
        <h2 className="label-mono px-1">Advanced</h2>
        <Card className="divide-y divide-border">
          <Row
            title="Developer mode"
            description="Show local connection diagnostics."
          >
            <Toggle
              checked={settings.developerMode}
              onChange={(v) => update({ developerMode: v })}
            />
          </Row>
        </Card>
      </section>

      <section className="space-y-2">
        <h2 className="label-mono px-1">Data & privacy</h2>
        <Card className="divide-y divide-border">
          <Row
            title="Local history"
            description="Transfer metadata is stored only in this browser (IndexedDB)."
          >
            <Button variant="secondary" size="sm" onClick={() => clear()}>
              Clear history
            </Button>
          </Row>
          <Row title="Version">
            <span className="font-mono text-[12px] text-muted-foreground">
              HyperSync 1.0.0
            </span>
          </Row>
        </Card>
      </section>

      <p className="rounded-2xl border-l-2 border-border-strong px-4 py-1 text-[12px] leading-relaxed text-muted-foreground">
        HyperSync never uploads file contents. Our backend only relays the
        messages that let two devices open a direct connection.
      </p>
    </div>
  )
}
