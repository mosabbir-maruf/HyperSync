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
  const { controller } = useSession()
  const { settings } = useSettings()

  const clientRef = useRef<SignalingClient | null>(null)
  if (!clientRef.current) clientRef.current = createSignalingClient()

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

  // Announce presence + subscribe to roster and inbound invites.
  useEffect(() => {
    const client = clientRef.current!
    const offRoster = client.on("roster", (e) => setRoster(e.devices))
    const offInvite = client.on("invite", (e) => {
      // The other device asked us to join — auto-join the channel.
      if (
        controller.getState().connectionState === ConnectionState.DISCONNECTED
      )
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
  }, [controller, thisDevice])

  // Tear down presence on unmount.
  useEffect(() => {
    const client = clientRef.current
    return () => client?.close()
  }, [])

  const connectTo = useCallback(
    async (device: DevicePresence) => {
      if (connecting) return
      setConnecting(device.peerId)
      try {
        const info = await controller.host()
        if (!info) return
        clientRef.current?.invite(device.peerId, info.code)
      } finally {
        setConnecting(null)
      }
    },
    [connecting, controller],
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
