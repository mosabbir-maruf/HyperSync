import { useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useSession } from "../state/SessionProvider"
import { CodeInput } from "../components/session/CodeInput"
import { SessionRoom } from "../components/session/SessionRoom"
import { ConnectionStatus } from "../components/layout/ConnectionStatus"
import { Button } from "../components/ui/Button"
import { Card } from "../components/ui/Card"
import { QrIcon } from "../components/ui/icons"

export function JoinSession() {
  const { controller, state } = useSession()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [attempted, setAttempted] = useState(false)
  const autoTried = useRef(false)

  // Auto-join when arriving via a QR link (?code=...).
  useEffect(() => {
    const code = params.get("code")
    if (code && !autoTried.current && state.phase === "idle") {
      autoTried.current = true
      setAttempted(true)
      void controller.join(code)
    }
  }, [params, controller, state.phase])

  const join = (code: string) => {
    setAttempted(true)
    void controller.join(code)
  }

  const leave = () => {
    controller.leave()
    setAttempted(false)
    navigate("/join", { replace: true })
  }

  const connected = state.phase === "connected"
  const busy = state.phase === "starting" || state.phase === "connecting"

  if (connected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Connected</h1>
            <div className="mt-1.5">
              <ConnectionStatus phase={state.phase} />
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={leave}>
            End session
          </Button>
        </div>
        <SessionRoom />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header className="space-y-2 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-primary">
          <QrIcon width={24} height={24} />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">
          Join a session
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter the six-character code shown on the sending device.
        </p>
      </header>

      <Card className="space-y-4 p-6">
        <CodeInput onComplete={join} autoFocus />
        {busy && (
          <div className="flex justify-center">
            <ConnectionStatus phase={state.phase} />
          </div>
        )}
        {attempted && state.phase === "error" && (
          <p className="text-center text-sm text-destructive">
            {state.error ?? "Could not join that session."}
          </p>
        )}
      </Card>

      <p className="text-center text-[12px] leading-relaxed text-muted-foreground">
        Scanning the QR on the other device opens this page and joins
        automatically.
      </p>
    </div>
  )
}
