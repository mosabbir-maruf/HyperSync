import { useEffect, useState } from "react"
import { useSession } from "../../state/SessionProvider"
import { useSettings } from "../../state/SettingsProvider"
import { ChatPanel } from "../messaging/ChatPanel"

/** The active session surface, shared by both host and guest once connected. */
export function SessionRoom({ onLeave }: { onLeave: () => void }) {
  const { controller, state, getMessagingController } = useSession()
  const { settings } = useSettings()
  const [messagingCtrl, setMessagingCtrl] = useState(getMessagingController())

  useEffect(() => {
    const handleBeforeUnload = () => {
      controller.leave()
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [controller])

  // Honor the auto-accept preference: skip the prompt for incoming files.
  useEffect(() => {
    if (settings.autoAccept && state.incoming) {
      void controller.accept(state.incoming.map((f) => f.transferId))
    }
  }, [settings.autoAccept, state.incoming, controller])

  // Poll for messaging controller until it becomes available
  // (it's created when the msg DataChannel fires — slightly after phase=connected)
  useEffect(() => {
    if (messagingCtrl) return
    const timer = setInterval(() => {
      const mc = getMessagingController()
      if (mc) {
        setMessagingCtrl(mc)
        clearInterval(timer)
      }
    }, 100)
    return () => clearInterval(timer)
  }, [messagingCtrl, getMessagingController])

  return (
    <div className="flex flex-col md:items-center w-full h-[700px] md:h-[800px]">
      <div className="flex flex-col w-full h-full">
        {messagingCtrl ? (
          <ChatPanel
            controller={messagingCtrl}
            sessionController={controller}
            visible={true}
            onFiles={(files) => controller.sendFiles(files)}
            onLeave={onLeave}
          />
        ) : (
          <ChatPlaceholder />
        )}
      </div>
    </div>
  )
}

function ChatPlaceholder() {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-border bg-card">
      <p className="label-mono px-6 text-center">
        Establishing message channel…
      </p>
    </div>
  )
}
