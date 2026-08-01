import { useCallback, useEffect, useState } from "react"
import {
  addHistoryEntry as dbAdd,
  clearHistory as dbClear,
  getHistory,
  onHistoryChange,
  type HistoryEntry,
} from "../lib/storage/historyStore"

import { toast } from "../lib/notify/toast"

export type { HistoryEntry } from "../lib/storage/historyStore"

/** Record a terminal transfer (metadata only). Fire-and-forget. */
export function addHistoryEntry(entry: HistoryEntry): void {
  void dbAdd(entry)
}

export function clearHistory(): void {
  void dbClear()
  if (typeof caches !== "undefined") {
    caches
      .keys()
      .then((names) => Promise.all(names.map((name) => caches.delete(name))))
      .catch((e) => console.warn("Could not clear caches", e))
  }
  toast.success("Local history and cache cleared")
}

/** React hook exposing the local history list, reactive to writes. */
export function useHistory(): { entries: HistoryEntry[] clear: () => void } {
  const [entries, setEntries] = useState<HistoryEntry[]>([])

  useEffect(() => {
    let active = true
    const refresh = () => {
      void getHistory().then((list) => {
        if (active) setEntries(list)
      })
    }
    refresh()
    const off = onHistoryChange(refresh)
    return () => {
      active = false
      off()
    }
  }, [])

  const clear = useCallback(() => clearHistory(), [])
  return { entries, clear }
}
