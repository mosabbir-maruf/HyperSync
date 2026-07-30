import { useEffect, useState } from "react"
import { toast, type Toast, type ToastKind } from "../../lib/notify/toast"
import { CheckIcon, CloseIcon } from "./icons"
import { cn } from "../../lib/utils"

const ACCENT: Record<ToastKind, string> = {
  success: "bg-success",
  error: "bg-destructive",
  warning: "bg-warning",
  info: "bg-primary",
  progress: "bg-primary",
}

/**
 * Renders the toast store. Mounted once near the app root; it holds no toast
 * logic of its own — it only subscribes to the notification service.
 */
export function ToastViewport() {
  const [toasts, setToasts] = useState<Toast[]>([])
  useEffect(() => toast.subscribe(setToasts), [])

  if (toasts.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.kind === "error" ? "alert" : "status"}
          aria-live={t.kind === "error" ? "assertive" : "polite"}
          className={cn(
            "pointer-events-auto relative w-full max-w-sm overflow-hidden border border-border-strong bg-card ds-slide-up",
          )}
        >
          <span
            className={cn("absolute inset-y-0 left-0 w-0.5", ACCENT[t.kind])}
            aria-hidden
          />
          <div className="flex items-start gap-3 py-3 pl-4 pr-2">
            {t.kind === "success" && (
              <CheckIcon
                width={16}
                height={16}
                className="mt-0.5 shrink-0 text-success"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium leading-snug">
                {t.message}
              </p>
              {t.description && (
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                  {t.description}
                </p>
              )}
              {t.kind === "progress" && typeof t.progress === "number" && (
                <div className="mt-2 h-1 w-full bg-secondary">
                  <div
                    className="h-full bg-primary transition-[width] duration-150"
                    style={{
                      width: `${Math.round(Math.min(1, Math.max(0, t.progress)) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
            <button
              onClick={() => toast.dismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <CloseIcon width={14} height={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
