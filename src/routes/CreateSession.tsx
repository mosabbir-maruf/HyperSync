import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useSession } from "../state/SessionProvider"
import { QRDisplay } from "../components/session/QRDisplay"
import { SessionCode } from "../components/session/SessionCode"
import { SessionRoom } from "../components/session/SessionRoom"
import { ConnectionStatus } from "../components/layout/ConnectionStatus"
import { Button } from "../components/ui/Button"
import { Card } from "../components/ui/Card"

export function CreateSession() {
  const { controller, state } = useSession()
  const navigate = useNavigate()

  useEffect(() => {
    if (state.phase === "idle") void controller.host()
  }, [controller, state.phase])

  const leave = () => {
    controller.leave()
    navigate("/")
  }

  const connected = state.phase === "connected"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {connected ? "Connected" : "Waiting for a device"}
          </h1>
          <div className="mt-1.5">
            <ConnectionStatus phase={state.phase} />
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={leave}>
          End session
        </Button>
      </div>

      {state.error && (
        <Card className="border-destructive/40 bg-destructive/8 px-4 py-3 text-sm">
          {state.error}
        </Card>
      )}

      {connected ? (
        <SessionRoom />
      ) : (
        <Card className="flex flex-col items-center gap-6 p-6 md:flex-row md:items-center md:gap-8 md:p-8">
          {state.info && <QRDisplay value={state.info.joinUrl} />}
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground">
                On the other device, scan this QR or enter the code:
              </p>
            </div>
            {state.info && <SessionCode code={state.info.code} />}
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Keep this tab open. The connection opens automatically once the
              other device joins.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
