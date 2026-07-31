import type { TransferDirection } from "../transfer/types"
import { logger } from "../../services/Logger"

/**
 * Local-only transfer history, persisted in IndexedDB. Stores METADATA ONLY —
 * never file bytes, never anything server-side (vision: history is local
 * browser only). Pure module with no React; consumed by the useHistory hook.
 */
export interface HistoryEntry {
  id: string
  name: string
  size: number
  direction: TransferDirection
  peerName: string
  status: "completed" | "failed" | "cancelled"
  timestamp: number
}

const DB_NAME = "hypersync"
const DB_VERSION = 1
const STORE = "history"
const MAX_ENTRIES = 500
const CHANGE_EVENT = "hypersync:history"

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" })
        store.createIndex("timestamp", "timestamp")
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"))
  })
  return dbPromise
}

function tx(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE)
}

function notifyChange(): void {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event(CHANGE_EVENT))
}

export async function addHistoryEntry(entry: HistoryEntry): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const req = tx(db, "readwrite").put(entry)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
    await pruneOldest(db)
    notifyChange()
  } catch (err) {
    logger.warn("Could not save local history", err)
  }
}

export async function getHistory(): Promise<HistoryEntry[]> {
  try {
    const db = await openDb()
    const all = await new Promise<HistoryEntry[]>((resolve, reject) => {
      const req = tx(db, "readonly").getAll()
      req.onsuccess = () => resolve(req.result as HistoryEntry[])
      req.onerror = () => reject(req.error)
    })
    return all.sort((a, b) => b.timestamp - a.timestamp)
  } catch (err) {
    logger.warn("Could not read local history", err)
    return []
  }
}

export async function clearHistory(): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const req = tx(db, "readwrite").clear()
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
    notifyChange()
  } catch (err) {
    logger.warn("Could not clear local history", err)
  }
}

/** Keep only the most recent MAX_ENTRIES rows. */
async function pruneOldest(db: IDBDatabase): Promise<void> {
  const all = await new Promise<HistoryEntry[]>((resolve) => {
    const req = tx(db, "readonly").getAll()
    req.onsuccess = () => resolve(req.result as HistoryEntry[])
    req.onerror = () => resolve([])
  })
  if (all.length <= MAX_ENTRIES) return
  const excess = all
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(0, all.length - MAX_ENTRIES)
  const store = tx(db, "readwrite")
  for (const e of excess) store.delete(e.id)
}

export function onHistoryChange(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  window.addEventListener(CHANGE_EVENT, handler)
  return () => window.removeEventListener(CHANGE_EVENT, handler)
}
