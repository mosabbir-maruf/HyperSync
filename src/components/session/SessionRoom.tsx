import { useEffect } from "react"
import { useSession } from "../../state/SessionProvider"
import { useSettings } from "../../state/SettingsProvider"
import { DropZone } from "./DropZone"
import { IncomingPrompt } from "./IncomingPrompt"
import { TransferRow } from "./TransferRow"
import { ShieldIcon } from "../ui/icons"

/** The active transfer surface, shared by both host and guest once connected. */
export function SessionRoom() {
  const { controller, state } = useSession()
  const { settings } = useSettings()
  const hasTransfers = state.items.length > 0

  // Honor the auto-accept preference: skip the prompt for incoming files.
  useEffect(() => {
    if (settings.autoAccept && state.incoming) {
      void controller.accept(state.incoming.map((f) => f.transferId))
    }
  }, [settings.autoAccept, state.incoming, controller])

  return (
    <div className="space-y-5">
      {state.incoming && (
        <IncomingPrompt
          files={state.incoming}
          onAccept={(ids) => void controller.accept(ids)}
          onReject={(ids) => controller.reject(ids)}
        />
      )}

      <DropZone onFiles={(files) => controller.sendFiles(files)} />

      {hasTransfers && (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="label-mono">Transfers</span>
            <span className="h-px flex-1 bg-border-strong" />
            <span className="label-mono">{state.items.length}</span>
          </div>
          <div className="space-y-2">
            {state.items.map((item) => (
              <TransferRow
                key={item.id}
                item={item}
                onPause={(id) => controller.pause(id)}
                onResume={(id) => controller.resume(id)}
                onCancel={(id) => controller.cancel(id)}
                onRetry={(id) => controller.retry(id)}
              />
            ))}
          </div>
        </section>
      )}

      <div className="flex items-start gap-3 rounded-2xl border-l-2 border-success bg-card px-4 py-3">
        <ShieldIcon
          width={16}
          height={16}
          className="mt-0.5 shrink-0 text-success"
        />
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground/60 sm:text-sm">
          Files transfer securely from device to device. They never touch
          HyperSync servers.
        </p>
      </div>
    </div>
  )
}
