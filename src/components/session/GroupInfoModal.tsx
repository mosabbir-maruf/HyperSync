import { Card } from "../ui/Card"
import { Button } from "../ui/Button"
import { QRDisplay } from "./QRDisplay"
import { SessionCode } from "./SessionCode"
import { Avatar } from "../ui/Avatar"
import { CloseIcon } from "../ui/icons"

export interface GroupInfoModalProps {
  isOpen: boolean
  onClose: () => void
  joinUrl?: string
  code?: string
  members?: string[]
}

export function GroupInfoModal({
  isOpen,
  onClose,
  joinUrl,
  code,
  members = [],
}: GroupInfoModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
      <Card className="relative w-full max-w-md overflow-hidden p-0 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-lg font-semibold">Group Info</h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 -mr-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <CloseIcon width={20} height={20} />
          </button>
        </div>

        <div className="flex flex-col gap-8 p-6 max-h-[70vh] overflow-y-auto">
          <div className="flex flex-col items-center text-center space-y-5">
            {joinUrl && <QRDisplay value={joinUrl} />}
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Scan QR or enter code to join
              </p>
              {code && <SessionCode code={code} />}
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <h4 className="text-sm font-semibold mb-4 px-1">
              Connected Members ({members.length})
            </h4>
            {members.length > 0 ? (
              <ul className="space-y-3">
                {members.map((name, i) => (
                  <li key={i} className="flex items-center gap-3 px-1">
                    <Avatar name={name} size="sm" />
                    <span className="text-sm font-medium">{name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground px-1 italic">
                No other members yet.
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
