import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { Button } from "../components/ui/Button"
import { cn } from "../lib/utils"

/**
 * Single reusable dialog implementation. Confirmation, cancel-transfer,
 * overwrite, leave-page and permission prompts all flow through `confirm()` —
 * no component rolls its own modal. Imperative + promise-based so call sites
 * read like `if (await confirm({...})) { ... }`.
 */
export type DialogTone = "default" | "danger"

export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: DialogTone
}

type Resolver = (value: boolean) => void

interface DialogContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>
}

const DialogContext = createContext<DialogContextValue | null>(null)

export function DialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<ConfirmOptions | null>(null)
  const resolverRef = useRef<Resolver | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
      setOpen(opts)
    })
  }, [])

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value)
    resolverRef.current = null
    setOpen(null)
  }, [])

  // Focus the primary action on open; restore focus on close.
  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    panelRef.current
      ?.querySelector<HTMLButtonElement>("[data-autofocus]")
      ?.focus()
    return () => previouslyFocused?.focus?.()
  }, [open])

  // Escape to cancel; Tab traps focus inside the panel.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        settle(false)
      } else if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])',
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, settle])

  return (
    <DialogContext.Provider value={{ confirm }}>
      {children}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
          aria-describedby={open.description ? "dialog-desc" : undefined}
        >
          <div
            className="absolute inset-0 bg-foreground/25 ds-fade-in"
            onClick={() => settle(false)}
          />
          <div
            ref={panelRef}
            className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border-strong bg-card ds-zoom-in"
          >
            <div className="space-y-2 p-5">
              <h2
                id="dialog-title"
                className="text-[15px] font-bold tracking-tight"
              >
                {open.title}
              </h2>
              {open.description && (
                <p
                  id="dialog-desc"
                  className="text-[13px] leading-relaxed text-muted-foreground"
                >
                  {open.description}
                </p>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => settle(false)}
              >
                {open.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                data-autofocus
                variant={open.tone === "danger" ? "danger" : "primary"}
                size="sm"
                onClick={() => settle(true)}
                className={cn(open.tone === "danger" && "min-w-20")}
              >
                {open.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  )
}

export function useConfirm(): (opts: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error("useConfirm must be used within DialogProvider")
  return ctx.confirm
}
