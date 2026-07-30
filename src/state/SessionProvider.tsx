import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { SessionController, type SessionState } from "./SessionController"
import { addHistoryEntry } from "./history"
import { useSettings } from "./SettingsProvider"
import { pageLifecycleService } from "../services/PageLifecycleService"

interface SessionContextValue {
  controller: SessionController
  state: SessionState
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const controllerRef = useRef<SessionController | null>(null)
  if (!controllerRef.current) controllerRef.current = new SessionController()
  const controller = controllerRef.current
  const { settings } = useSettings()

  const state = useSyncExternalStore(
    (cb) => controller.subscribe(cb),
    () => controller.getState(),
  )

  // Record terminal transfers to local history (metadata only).
  const recorded = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!settings.keepHistory) return
    for (const item of state.items) {
      const terminal =
        item.status === "completed" ||
        item.status === "failed" ||
        item.status === "cancelled"
      if (terminal && !recorded.current.has(item.id)) {
        recorded.current.add(item.id)
        addHistoryEntry({
          id: item.id,
          name: item.name,
          size: item.size,
          direction: item.direction,
          peerName:
            state.role === "host" ? "Received device" : "Sending device",
          status: item.status as "completed" | "failed" | "cancelled",
          timestamp: Date.now(),
        })
      }
    }
  }, [state.items, state.role, settings.keepHistory])

  // Keep active transfers visible through mobile suspend/wake and warn before
  // a browser refresh or tab close can discard an in-memory connection.
  useEffect(() => {
    const hasActiveTransfer = () =>
      controller
        .getState()
        .items.some(
          (item) => item.status === "progress" || item.status === "paused",
        )
    return pageLifecycleService.on("beforeunload", (event) => {
      if (!hasActiveTransfer()) return
      event.preventDefault()
      ;(event as BeforeUnloadEvent).returnValue = ""
    })
  }, [controller])

  return (
    <SessionContext.Provider value={{ controller, state }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error("useSession must be used within SessionProvider")
  return ctx
}
