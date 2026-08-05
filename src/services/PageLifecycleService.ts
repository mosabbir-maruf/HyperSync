import { browserAdapter } from "../browser/BrowserAdapter"

export type PageLifecycleEvent = "visibility" | "pagehide" | "pageshow" | "beforeunload"

export interface PageLifecycleService {
  on(event: PageLifecycleEvent, listener: (event: Event) => void): () => void
}

/** Centralized lifecycle boundary for suspend, wake, refresh, and tab-close handling. */
export class BrowserPageLifecycleService implements PageLifecycleService {
  on(event: PageLifecycleEvent, listener: (event: Event) => void): () => void {
    const type = event === "visibility" ? "visibilitychange" : event
    const document = browserAdapter.document
    if (!document) return () => undefined
    document.addEventListener(type, listener)
    return () => document.removeEventListener(type, listener)
  }
}

export const pageLifecycleService: PageLifecycleService =
  new BrowserPageLifecycleService()
