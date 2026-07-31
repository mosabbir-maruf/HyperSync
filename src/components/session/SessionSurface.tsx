import { useSession } from "../../state/SessionProvider"
import { useConfirm } from "../../state/DialogProvider"
import { ConnectionStatus } from "../layout/ConnectionStatus"
import { SessionRoom } from "./SessionRoom"
import { QRDisplay } from "./QRDisplay"
import { SessionCode } from "./SessionCode"
import { Button } from "../ui/Button"
import { ChatPanel } from "../messaging/ChatPanel"
import { ConnectionState } from "../../state/managers/ConnectionStateManager"

/**
 * The live session surface shown once a connection is initiated — from either
 * side (host who invited, or guest who was invited). Renders the pairing panel
 * while waiting and the transfer room once the data channel opens.
 */
export function SessionSurface() {
  const { controller, state } = useSession()
  const confirm = useConfirm()

  const connected = state.connectionState === ConnectionState.CONNECTED
  const hasActiveTransfer = state.items.some(
    (i) => i.status === "progress" || i.status === "paused",
  )

  const leave = async () => {
    if (hasActiveTransfer) {
      const ok = await confirm({
        title: "End session?",
        description:
          "A transfer is still in progress. Ending now will cancel it.",
        confirmLabel: "End session",
        cancelLabel: "Keep going",
        tone: "danger",
      })
      if (!ok) return
    }
    controller.leave()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {connected
              ? "Connected"
              : state.role === "guest"
                ? "Joining…"
                : "Waiting for device"}
          </h1>
          <div className="mt-2">
            <ConnectionStatus phase={state.connectionState} />
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={leave}>
          End session
        </Button>
      </div>

      {state.error && (
        <div className="rounded-2xl border-l-2 border-destructive bg-card px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}
      {connected ? (
        <SessionRoom />
      ) : (
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-border-strong bg-card p-6 md:flex-row md:gap-8 md:p-8">
          {state.info && <QRDisplay value={state.info.joinUrl} />}
          <div className="flex-1 space-y-4 text-center md:text-left">
            <p className="text-sm text-muted-foreground">
              Waiting for the other device to accept. It can also scan this QR
              or enter the code manually:
            </p>
            {state.info && <SessionCode code={state.info.code} />}
          </div>
        </div>
      )}
    </div>
  )
}
