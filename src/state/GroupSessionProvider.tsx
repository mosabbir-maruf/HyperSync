import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import {
  GroupSessionManager,
  type GroupSessionState,
} from "./managers/GroupSessionManager"
import { addHistoryEntry } from "./history"
import { useSettings } from "./SettingsProvider"
import { pageLifecycleService } from "../services/PageLifecycleService"

interface GroupSessionContextValue {
  controller: GroupSessionManager
  state: GroupSessionState
  getMessagingController: () => import("./managers/GroupMessagingManager").GroupMessagingManager
}

const GroupSessionContext = createContext<GroupSessionContextValue | null>(null)

export function GroupSessionProvider({ children }: { children: ReactNode }) {
  const controllerRef = useRef<GroupSessionManager | null>(null)
  if (!controllerRef.current) controllerRef.current = new GroupSessionManager()
  const controller = controllerRef.current
  const { settings } = useSettings()

  const state = useSyncExternalStore(
    (cb) => controller.subscribe(cb),
    () => controller.getState(),
  )

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
          peerName: "Group Member",
          status: item.status as "completed" | "failed" | "cancelled",
          timestamp: Date.now(),
        })
      }
    }
  }, [state.items, settings.keepHistory])

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
    <GroupSessionContext.Provider
      value={{
        controller,
        state,
        getMessagingController: () => controller.getMessagingManager(),
      }}
    >
      {children}
    </GroupSessionContext.Provider>
  )
}

export function useGroupSession(): GroupSessionContextValue {
  const ctx = useContext(GroupSessionContext)
  if (!ctx)
    throw new Error("useGroupSession must be used within GroupSessionProvider")
  return ctx
}
