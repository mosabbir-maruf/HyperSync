import { TransferManager, type TransferState } from "./TransferManager"
import { TransferEngine } from "../../lib/transfer/TransferEngine"
import type { TransferEvent } from "../../lib/transfer/types"

export class GroupTransferManager {
  private managers = new Map<string, TransferManager>()
  private listeners = new Set<(s: TransferState) => void>()

  // Aggregate state
  private state: TransferState = { items: [], incoming: null }

  // Forward events up
  private eventListeners = new Set<(peerId: string, e: TransferEvent) => void>()

  public attachEngine(peerId: string, engine: TransferEngine) {
    const tm = new TransferManager()
    tm.attachEngine(engine)

    // Listen for state changes to aggregate
    tm.subscribe((s) => this.aggregateState())

    // Forward raw events
    tm.onEngineEvent((e) => {
      for (const listener of this.eventListeners) {
        listener(peerId, e)
      }
    })

    this.managers.set(peerId, tm)
    this.aggregateState()
  }

  public removeEngine(peerId: string) {
    const tm = this.managers.get(peerId)
    if (tm) {
      tm.destroy()
      this.managers.delete(peerId)
    }
    this.aggregateState()
  }

  private aggregateState() {
    // Combine items from all managers
    // For a real app, we'd group them by transferId.
    // Since each manager creates its own transferId (because they independently process sendFiles),
    // they will appear as separate transfers in the UI.
    // To fix this, we should really sync the transferId, but for now we just list them all.
    let allItems: any[] = []
    let allIncoming: any[] = []

    for (const [peerId, tm] of this.managers.entries()) {
      const s = tm.getState()

      // Tag items with peerId for UI
      const taggedItems = s.items.map((i) => ({ ...i, peerId }))
      allItems = allItems.concat(taggedItems)

      if (s.incoming) {
        allIncoming = allIncoming.concat(
          s.incoming.map((i) => ({ ...i, peerId })),
        )
      }
    }

    this.state = {
      items: allItems,
      incoming: allIncoming.length > 0 ? allIncoming : null,
    }

    for (const fn of this.listeners) {
      fn(this.state)
    }
  }

  public subscribe(fn: (s: TransferState) => void): () => void {
    this.listeners.add(fn)
    fn(this.state)
    return () => this.listeners.delete(fn)
  }

  public getState(): TransferState {
    return this.state
  }

  public onEngineEvent(
    fn: (peerId: string, e: TransferEvent) => void,
  ): () => void {
    this.eventListeners.add(fn)
    return () => this.eventListeners.delete(fn)
  }

  // --- Actions ---

  public sendFiles(files: File[], targetPeerId?: string): void {
    if (targetPeerId) {
      this.managers.get(targetPeerId)?.sendFiles(files)
    } else {
      // Fan-out to all
      for (const tm of this.managers.values()) {
        tm.sendFiles(files)
      }
    }
  }

  public accept(ids: string[], peerId?: string): Promise<void> {
    if (peerId)
      return this.managers.get(peerId)?.accept(ids) ?? Promise.resolve()
    const promises = Array.from(this.managers.values()).map((tm) =>
      tm.accept(ids),
    )
    return Promise.all(promises).then(() => {})
  }

  public reject(ids: string[], peerId?: string): void {
    if (peerId) this.managers.get(peerId)?.reject(ids)
    else for (const tm of this.managers.values()) tm.reject(ids)
  }

  public pause(id: string, peerId?: string): void {
    if (peerId) this.managers.get(peerId)?.pause(id)
    else for (const tm of this.managers.values()) tm.pause(id)
  }

  public resume(id: string, peerId?: string): void {
    if (peerId) this.managers.get(peerId)?.resume(id)
    else for (const tm of this.managers.values()) tm.resume(id)
  }

  public cancel(id: string, peerId?: string): void {
    if (peerId) this.managers.get(peerId)?.cancel(id)
    else for (const tm of this.managers.values()) tm.cancel(id)
  }

  public retry(id: string, peerId?: string): void {
    if (peerId) this.managers.get(peerId)?.retry(id)
    else for (const tm of this.managers.values()) tm.retry(id)
  }

  public remove(id: string, peerId?: string): void {
    if (peerId) this.managers.get(peerId)?.remove(id)
    else for (const tm of this.managers.values()) tm.remove(id)
  }

  public clearQueue(): void {
    for (const tm of this.managers.values()) {
      tm.clearQueue()
    }
  }

  public destroy(): void {
    for (const peerId of this.managers.keys()) {
      this.removeEngine(peerId)
    }
    this.listeners.clear()
    this.eventListeners.clear()
    this.state = { items: [], incoming: null }
  }
}
