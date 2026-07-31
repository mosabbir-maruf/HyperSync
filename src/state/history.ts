import { useCallback, useEffect, useState } from "react"
import {
  addHistoryEntry as dbAdd,
  clearHistory as dbClear,
  getHistory,
  onHistoryChange,
  type HistoryEntry,
} from "../lib/storage/historyStore"

export type { HistoryEntry } from "../lib/storage/historyStore"

/** Record a terminal transfer (metadata only). Fire-and-forget. */
export function addHistoryEntry(entry: HistoryEntry): void {
  void dbAdd(entry)
}

export function clearHistory(): void {
  void dbClear()
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
