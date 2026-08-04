import { useEffect, useState, useSyncExternalStore, useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useGroupSession } from "../state/GroupSessionProvider"
import { useSettings } from "../state/SettingsProvider"
import { Button } from "../components/ui/Button"
import { Card } from "../components/ui/Card"
import { ConnectionStatus } from "../components/layout/ConnectionStatus"
import { ConnectionState } from "../state/managers/ConnectionStateManager"
import { SessionCode } from "../components/session/SessionCode"
import { QRDisplay } from "../components/session/QRDisplay"
import { ChatPanel } from "../components/messaging/ChatPanel"
import { GroupInfoModal } from "../components/session/GroupInfoModal"

export function GroupRoom() {
  const { code } = useParams<{ code: string }>()
  const [isInfoOpen, setIsInfoOpen] = useState(false)
  const navigate = useNavigate()
  const { state, controller } = useGroupSession()
  const { settings } = useSettings()
  const leavingRef = useRef(false)

  const messagingState = useSyncExternalStore(
    (cb) => controller.getMessagingManager().subscribe(cb),
    () => controller.getMessagingManager().getState(),
  )

  useEffect(() => {
    if (
      !leavingRef.current &&
      state.connectionState === ConnectionState.DISCONNECTED &&
      code &&
      !state.info
    ) {
      controller.join(code).catch(() => {
        navigate("/group")
      })
    }
  }, [code, state.connectionState, state.info, controller, navigate])

  // Honor the auto-accept preference: skip the prompt for incoming files.
  useEffect(() => {
    if (settings.autoAccept && state.incoming) {
      void controller.accept(state.incoming.map((f) => f.transferId))
    }
  }, [settings.autoAccept, state.incoming, controller])

  const handleLeave = () => {
    leavingRef.current = true
    controller.leave()
    navigate("/group")
  }

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!leavingRef.current) {
        controller.leave()
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [controller])

  const connected =
    state.connectionState === ConnectionState.CONNECTED ||
    state.connectionState === ConnectionState.DEGRADED

  if (connected) {
    const messagingCtrl = controller.getMessagingManager()

    return (
      <>
        <div className="flex flex-col md:items-center w-full h-[700px] md:h-[800px]">
          <div className="flex flex-col w-full h-full">
            {messagingCtrl ? (
              <ChatPanel
                controller={messagingCtrl}
                sessionController={controller}
                visible={true}
                onFiles={(files) => controller.sendFiles(files)}
                onLeave={handleLeave}
                title={code}
                isGroup={true}
                onInfoClick={() => setIsInfoOpen(true)}
              />
            ) : (
              <ChatPlaceholder />
            )}
          </div>
        </div>

        <GroupInfoModal
          isOpen={isInfoOpen}
          onClose={() => setIsInfoOpen(false)}
          joinUrl={state.info?.joinUrl}
          code={code}
          members={messagingState.memberNames}
        />
      </>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Connecting to Group
          </h1>
          <div className="mt-1.5">
            <ConnectionStatus phase={state.connectionState as ConnectionState} />
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLeave}>
          Cancel
        </Button>
      </div>

      {state.error && (
        <Card className="border-destructive/40 bg-destructive/8 px-4 py-3 text-sm">
          {state.error}
        </Card>
      )}

      {state.role === "host" ? (
        <Card className="flex flex-col items-center gap-6 p-6 md:flex-row md:items-center md:gap-8 md:p-8">
          {state.info && <QRDisplay value={state.info.joinUrl} />}
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground">
                On the other device, scan this QR or enter the code:
              </p>
            </div>
            <SessionCode code={code || ""} />
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Keep this tab open. Share this code with up to 7 other people.
            </p>
          </div>
        </Card>
      ) : (
        <div className="flex h-[300px] items-center justify-center rounded-2xl border border-border bg-card">
          <p className={`label-mono px-6 text-center ${state.connectionState === ConnectionState.FAILED ? "text-destructive" : "animate-pulse"}`}>
            {state.connectionState === ConnectionState.FAILED ? "Connection failed" : "Joining group..."}
          </p>
        </div>
      )}

      <GroupInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        joinUrl={state.info?.joinUrl}
        code={code}
        members={messagingState.memberNames}
      />
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
