import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { createSignalingClient } from "../lib/signaling"
import type { SignalingClient } from "../lib/signaling"
import type { DevicePresence } from "../lib/signaling"
import { useSession } from "./SessionProvider"
import { useGroupSession } from "./GroupSessionProvider"
import { useSettings } from "./SettingsProvider"
import { avatarColor, detectPlatform } from "../lib/utils"
import { ConnectionState } from "./managers/ConnectionStateManager"

/**
 * Discovery layer for "nearby devices". Owns a dedicated presence
 * SignalingClient (separate from the session transport, but sharing the same
 * backend), announces this device to the lobby, and tracks the roster.
 *
 * Clicking a device hosts a session and invites the target, which auto-joins.
 * Discovery is transport-provided; this state never fabricates peer devices.
 */
interface LobbyContextValue {
  thisDevice: DevicePresence
  devices: DevicePresence[]
  connecting: string | null
  connectTo: (device: DevicePresence) => Promise<void>
}

const LobbyContext = createContext<LobbyContextValue | null>(null)

export function LobbyProvider({ children }: { children: ReactNode }) {
  const { controller, state: p2pState } = useSession()
  const { state: groupState } = useGroupSession()
  const { settings } = useSettings()

  const [roster, setRoster] = useState<DevicePresence[]>([])
  const [connecting, setConnecting] = useState<string | null>(null)

  const thisDevice = useMemo<DevicePresence>(
    () => ({
      peerId: "self",
      name: settings.displayName || "This device",
      platform: detectPlatform(),
      color: avatarColor(settings.displayName || "This device"),
    }),
    [settings.displayName],
  )

  const isBusy =
    p2pState.connectionState !== ConnectionState.DISCONNECTED ||
    groupState.connectionState !== ConnectionState.DISCONNECTED

  // Ref tracks the latest isBusy value so event callbacks always see current state
  // without requiring effect re-subscription on every render.
  const clientRef = useRef<SignalingClient | null>(null)
  const isBusyRef = useRef(isBusy)
  isBusyRef.current = isBusy

  // Announce presence + subscribe to roster and inbound invites, only if not busy.
  useEffect(() => {
    if (isBusy) {
      // Give pending invites time to flush before tearing down the lobby socket.
      const timer = setTimeout(() => {
        if (clientRef.current) {
          clientRef.current.close()
          clientRef.current = null
        }
        setRoster([])
      }, 3000)
      return () => clearTimeout(timer)
    }

    if (!clientRef.current) {
      clientRef.current = createSignalingClient()
    }
    const client = clientRef.current

    const offRoster = client.on("roster", (e) => setRoster(e.devices))

    const offInvite = client.on("invite", (e) => {
      // Guard against ALL active sessions (p2p + group).
      // isBusyRef covers both controllers — prevents accepting a lobby invite
      // while any session is active, which would cause a UI mismatch.
      if (isBusyRef.current) return
      void controller.join(e.code)
    })

    client.announce({
      name: thisDevice.name,
      color: thisDevice.color,
      platform: thisDevice.platform,
    })

    return () => {
      offRoster()
      offInvite()
    }
  }, [controller, thisDevice, isBusy])

  // Tear down presence on unmount.
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.close()
        clientRef.current = null
      }
    }
  }, [])

  const connectTo = useCallback(
    async (device: DevicePresence) => {
      if (connecting || isBusy) return
      setConnecting(device.peerId)
      try {
        // Re-check right before hosting — an incoming invite may have been
        // accepted between the user click and this async continuation.
        if (
          controller.getState().connectionState !== ConnectionState.DISCONNECTED
        )
          return
        const info = await controller.host()
        if (!info) return
        clientRef.current?.invite(device.peerId, info.code)
      } finally {
        setConnecting(null)
      }
    },
    [connecting, controller, isBusy],
  )

  const value = useMemo<LobbyContextValue>(
    () => ({
      thisDevice,
      devices: roster,
      connecting,
      connectTo,
    }),
    [thisDevice, roster, connecting, connectTo],
  )

  return <LobbyContext.Provider value={value}>{children}</LobbyContext.Provider>
}

export function useLobby(): LobbyContextValue {
  const ctx = useContext(LobbyContext)
  if (!ctx) throw new Error("useLobby must be used within LobbyProvider")
  return ctx
}
