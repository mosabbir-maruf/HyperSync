import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useGroupSession } from "../state/GroupSessionProvider"
import { Button } from "../components/ui/Button"
import { Card } from "../components/ui/Card"
import { toast } from "../lib/notify/toast"
import {
  RadarIcon,
  QrIcon,
  UsersIcon,
  KeyboardIcon,
} from "../components/ui/icons"
import { QrScannerModal } from "../components/session/QrScannerModal"
import { CodeInput } from "../components/session/CodeInput"

export function GroupLanding() {
  const navigate = useNavigate()
  const { controller } = useGroupSession()
  const [joinCode, setJoinCode] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [mode, setMode] = useState<"menu" | "join">("menu")

  const handleCreateGroup = async () => {
    setIsCreating(true)
    try {
      const info = await controller.host()
      if (info) {
        navigate(`/group/${info.code}`)
      } else {
        toast.error("Failed to create group")
      }
    } catch (err) {
      toast.error("Error creating group")
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinGroupWithCode = async (code: string) => {
    if (!code) return
    setIsJoining(true)
    try {
      await controller.join(code)
      navigate(`/group/${code}`)
    } catch (err) {
      toast.error("Error joining group")
    } finally {
      setIsJoining(false)
    }
  }

  if (mode === "join") {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <header className="space-y-2 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-primary">
            <KeyboardIcon width={24} height={24} />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">
            Join a group
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter the 6-character code shown on a group member's device.
          </p>
        </header>

        <Card className="space-y-4 p-6">
          <CodeInput
            onComplete={(code) => {
              setJoinCode(code)
              handleJoinGroupWithCode(code)
            }}
            autoFocus
          />

          <div className="relative flex items-center justify-center my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <span className="relative bg-card px-3 text-xs uppercase text-muted-foreground font-mono">
              Or
            </span>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full gap-2 border border-border-strong py-2.5 h-12"
            onClick={() => setIsScannerOpen(true)}
          >
            <QrIcon width={18} height={18} />
            Scan QR Code with Camera
          </Button>

          {isJoining && (
            <div className="flex justify-center text-sm text-muted-foreground">
              Joining group...
            </div>
          )}
        </Card>

        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={() => setMode("menu")}>
            ← Back to options
          </Button>
        </div>

        <QrScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScan={(code) => {
            setJoinCode(code)
            setIsScannerOpen(false)
          }}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 pt-4 sm:pt-8">
      <section className="relative flex flex-col items-center justify-center overflow-hidden px-4 pt-8 pb-8 text-center sm:px-8">
        <div className="relative z-10 w-full space-y-8">
          <h1 className="text-4xl font-black leading-[0.9] tracking-tighter md:text-6xl lg:text-7xl">
            Group Session. <br />
            <span className="text-primary">Connect together.</span>
          </h1>
          <p className="text-muted-foreground mx-auto max-w-md">
            Create or join a room to share files with up to 8 devices
            simultaneously.
          </p>
        </div>
      </section>

      <section className="space-y-4 px-4 sm:px-0">
        <div className="grid overflow-hidden rounded-3xl border border-border-strong sm:grid-cols-2">
          <button
            onClick={handleCreateGroup}
            disabled={isCreating}
            className="group flex items-center gap-3 border-b border-border-strong p-5 transition-colors hover:bg-card sm:border-b-0 sm:border-r text-left w-full"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              {isCreating ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <UsersIcon width={20} height={20} />
              )}
            </span>
            <div>
              <p className="text-sm font-bold tracking-tight">Create a group</p>
              <p className="text-[12px] text-muted-foreground">
                Host a new group room
              </p>
            </div>
            <span className="ml-auto text-muted-foreground transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </button>

          <button
            onClick={() => setMode("join")}
            className="group flex items-center gap-3 p-5 transition-colors hover:bg-card text-left w-full"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-strong">
              <KeyboardIcon width={20} height={20} />
            </span>
            <div>
              <p className="text-sm font-bold tracking-tight">Join a group</p>
              <p className="text-[12px] text-muted-foreground">
                Enter a code or scan QR
              </p>
            </div>
            <span className="ml-auto text-muted-foreground transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </button>
        </div>
      </section>
    </div>
  )
}
