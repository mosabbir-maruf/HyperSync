import { useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useGroupSession } from "../state/GroupSessionProvider"
import { Button } from "../components/ui/Button"
import { Card } from "../components/ui/Card"
import { ConnectionStatus } from "../components/layout/ConnectionStatus"
import { ConnectionState } from "../state/managers/ConnectionStateManager"
import { SessionCode } from "../components/session/SessionCode"
import { QRDisplay } from "../components/session/QRDisplay"

export function GroupRoom() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { state, controller } = useGroupSession()

  useEffect(() => {
    if (
      state.connectionState === ConnectionState.DISCONNECTED &&
      code &&
      !state.info
    ) {
      controller.join(code).catch(() => {
        navigate("/group")
      })
    }
  }, [code, state.connectionState, state.info, controller, navigate])

  const handleLeave = () => {
    controller.leave()
    navigate("/group")
  }

  const connected =
    state.connectionState === ConnectionState.CONNECTED ||
    state.connectionState === ConnectionState.DEGRADED

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {connected ? "Group Connected" : "Connecting to Group"}
          </h1>
          <div className="mt-1.5">
            <ConnectionStatus phase={state.connectionState} />
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLeave}>
          Leave group
        </Button>
      </div>

      {state.error && (
        <Card className="border-destructive/40 bg-destructive/8 px-4 py-3 text-sm">
          {state.error}
        </Card>
      )}

      {connected ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="flex flex-col h-[500px]">
            <div className="p-4 border-b border-border-strong font-semibold">
              Messaging
            </div>
            <div className="flex-1 p-4 text-muted-foreground flex items-center justify-center">
              Group messaging interface coming soon
            </div>
          </Card>
          <Card className="flex flex-col h-[500px]">
            <div className="p-4 border-b border-border-strong font-semibold flex justify-between items-center">
              <span>File Transfers</span>
              <Button
                size="sm"
                onClick={() => {
                  const file = new File(["test data"], "test.txt", {
                    type: "text/plain",
                  })
                  controller.sendFiles([file])
                }}
              >
                Test Send
              </Button>
            </div>
            <div className="flex-1 p-4 text-muted-foreground flex items-center justify-center">
              Group transfers interface coming soon
            </div>
          </Card>
        </div>
      ) : (
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
      )}
    </div>
  )
}
