import { randomId } from "../utils"

/**
 * Reusable notification service. This is a framework-agnostic module singleton
 * (like the signaling hub) so any layer — including non-React services — can
 * raise a toast without an `alert()` or a prop drill. The ToastProvider
 * subscribes and renders; nothing else needs to know how they're displayed.
 */
export type ToastKind = "success" | "error" | "warning" | "info" | "progress"

export interface Toast {
  id: string
  kind: ToastKind
  message: string
  description?: string
  /** ms until auto-dismiss; 0 or a "progress" toast stays until dismissed. */
  duration: number
  /** 0..1 for progress toasts. */
  progress?: number
}

type Listener = (toasts: Toast[]) => void

const DEFAULT_DURATION: Record<ToastKind, number> = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: 8000,
  progress: 0,
}

class ToastStore {
  private toasts: Toast[] = []
  private listeners = new Set<Listener>()
  private timers = new Map<string, ReturnType<typeof setTimeout>>()

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    fn(this.toasts)
    return () => this.listeners.delete(fn)
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.toasts)
  }

  show(input: Partial<Toast> & { message: string kind?: ToastKind }): string {
    const kind = input.kind ?? "info"
    const id = input.id ?? randomId()
    const duration = input.duration ?? DEFAULT_DURATION[kind]
    const toast: Toast = {
      id,
      kind,
      message: input.message,
      description: input.description,
      duration,
      progress: input.progress,
    }

    const existing = this.toasts.findIndex((t) => t.id === id)
    if (existing >= 0)
      this.toasts = this.toasts.map((t) => (t.id === id ? toast : t))
    else this.toasts = [...this.toasts, toast]

    this.arm(id, duration)
    this.emit()
    return id
  }

  private arm(id: string, duration: number): void {
    const prev = this.timers.get(id)
    if (prev) clearTimeout(prev)
    this.timers.delete(id)
    if (duration > 0) {
      this.timers.set(
        id,
        setTimeout(() => this.dismiss(id), duration),
      )
    }
  }

  dismiss(id: string): void {
    const timer = this.timers.get(id)
    if (timer) clearTimeout(timer)
    this.timers.delete(id)
    this.toasts = this.toasts.filter((t) => t.id !== id)
    this.emit()
  }

  clear(): void {
    for (const t of this.timers.values()) clearTimeout(t)
    this.timers.clear()
    this.toasts = []
    this.emit()
  }
}

const store = new ToastStore()

export const toast = {
  subscribe: (fn: Listener) => store.subscribe(fn),
  dismiss: (id: string) => store.dismiss(id),
  clear: () => store.clear(),
  success: (message: string, description?: string) =>
    store.show({ kind: "success", message, description }),
  error: (message: string, description?: string) =>
    store.show({ kind: "error", message, description }),
  warning: (message: string, description?: string) =>
    store.show({ kind: "warning", message, description }),
  info: (message: string, description?: string) =>
    store.show({ kind: "info", message, description }),
  /** Create or update a sticky progress toast; pass the same id to update. */
  progress: (id: string, message: string, value: number) =>
    store.show({ id, kind: "progress", message, progress: value, duration: 0 }),
}
