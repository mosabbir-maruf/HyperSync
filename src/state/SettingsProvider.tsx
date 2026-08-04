import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

/**
 * User settings, persisted locally. Language is scaffolded (single locale for
 * now) so the app is i18n-ready without pulling in a framework prematurely.
 */
export interface Settings {
  displayName: string
  autoAccept: boolean
  keepHistory: boolean
  soundOnComplete: boolean
  /** Data-channel chunk size in bytes (advanced). */
  chunkSize: number
  /** Surface extra diagnostics for development. */
  developerMode: boolean
  language: string
}

const DEFAULTS: Settings = {
  displayName: "",
  autoAccept: false,
  keepHistory: true,
  soundOnComplete: true,
  chunkSize: 16 * 1024,
  developerMode: false,
  language: "en",
}

const STORAGE_KEY = "hypersync.settings"

interface SettingsContextValue {
  settings: Settings
  update: (patch: Partial<Settings>) => void
}

import { MARVEL_CHARACTERS } from "../lib/utils"

const SettingsContext = createContext<SettingsContextValue | null>(null)

function randomName(): string {
  const bytes = new Uint8Array(1)
  crypto.getRandomValues(bytes)
  return MARVEL_CHARACTERS[bytes[0] % MARVEL_CHARACTERS.length]
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const parsed = stored ? JSON.parse(stored) as Partial<Settings> : {}
      return {
        ...DEFAULTS,
        displayName: parsed.displayName || randomName(),
        ...parsed,
      }
    } catch {
      return { ...DEFAULTS, displayName: randomName() }
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (err) {
      console.error("Failed to save settings:", err)
    }
  }, [settings])

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      update: (patch) => setSettings((s) => ({ ...s, ...patch })),
    }),
    [settings],
  )

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider")
  return ctx
}
