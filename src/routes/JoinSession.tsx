import { useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useSession } from "../state/SessionProvider"
import { CodeInput } from "../components/session/CodeInput"
import { SessionRoom } from "../components/session/SessionRoom"
import { ConnectionStatus } from "../components/layout/ConnectionStatus"
import { Button } from "../components/ui/Button"
import { Card } from "../components/ui/Card"
import { QrIcon, KeyboardIcon } from "../components/ui/icons"
import { QrScannerModal } from "../components/session/QrScannerModal"
import { ConnectionState } from "../state/managers/ConnectionStateManager"
import { logger } from "../services/Logger"

export function JoinSession() {
  const { controller, state } = useSession()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [attempted, setAttempted] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const autoTried = useRef(false)

  // Auto-join when arriving via a QR link (?code=...).
  useEffect(() => {
    const code = params.get("code")
    if (
      code &&
      !autoTried.current &&
      state.connectionState === ConnectionState.DISCONNECTED
    ) {
      autoTried.current = true
      setAttempted(true)
      controller.join(code).catch((err) => {
        logger.warn("Failed to auto-join:", err)
      })
    }
  }, [params, controller, state.connectionState])

  const join = (code: string) => {
    if (code.toUpperCase().startsWith("G")) {
      navigate(`/group?code=${code}`, { replace: true })
      return
    }
    setAttempted(true)
    controller.join(code).catch((err) => {
      logger.warn("Failed to join:", err)
    })
  }

  const leave = () => {
    controller.leave()
    setAttempted(false)
    navigate("/join", { replace: true })
  }

  const connected =
    state.connectionState === ConnectionState.CONNECTED ||
    state.connectionState === ConnectionState.DEGRADED
  const busy =
    state.connectionState === ConnectionState.SIGNALING ||
    state.connectionState === ConnectionState.NEGOTIATING ||
    state.connectionState === ConnectionState.CONNECTING

  if (connected) {
    return (
      <div className="h-[700px] md:h-auto">
        <SessionRoom onLeave={leave} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header className="space-y-2 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
          <KeyboardIcon width={24} height={24} />
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

        <div className="relative flex items-center justify-center my-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <span className="relative bg-card px-3 text-xs uppercase text-muted-foreground font-mono">
            Or
          </span>
        </div>

        <Button
          variant="secondary"
          className="w-full gap-2 border border-border-strong py-2.5"
          onClick={() => setIsScannerOpen(true)}
        >
          <QrIcon width={18} height={18} />
          Scan QR Code with Camera
        </Button>

        {busy && (
          <div className="flex justify-center">
            <ConnectionStatus phase={state.connectionState} />
          </div>
        )}
        {attempted && state.connectionState === ConnectionState.FAILED && (
          <div className="text-center text-sm text-destructive">
            {state.error ||
              "Connection failed. The code may be invalid or the host left."}
          </div>
        )}
      </Card>

      <p className="text-center text-[12px] leading-relaxed text-muted-foreground">
        Point your camera at the QR code on the sending device to connect
        automatically.
      </p>

      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(code, isGroup) => {
          if (isGroup) {
            navigate(`/group?code=${code}`, { replace: true })
          } else {
            join(code)
          }
        }}
      />
    </div>
  )
}
