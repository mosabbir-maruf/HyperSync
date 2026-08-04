import { TransferManager, type TransferState } from "./TransferManager"
import { makeTransferId } from "../../lib/utils"
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
    let tm = this.managers.get(peerId)
    if (!tm) {
      tm = new TransferManager()
      
      // Listen for state changes to aggregate
      tm.subscribe((s) => this.aggregateState())

      // Forward raw events
      tm.onEngineEvent((e) => {
        for (const listener of this.eventListeners) {
          listener(peerId, e)
        }
      })

      this.managers.set(peerId, tm)
    }

    tm.attachEngine(engine)
    this.aggregateState()
  }

  public removeEngine(peerId: string) {
    const tm = this.managers.get(peerId)
    if (tm) {
      tm.detachEngine()
      // We purposefully DO NOT delete(peerId) from managers here so that transfer history
      // remains visible in the UI even if the peer temporarily disconnects.
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

    const outgoingGroups = new Map<string, any[]>()

    for (const [peerId, tm] of this.managers.entries()) {
      const s = tm.getState()

      for (const item of s.items) {
        if (item.direction === "send") {
          const key = item.id
          if (!outgoingGroups.has(key)) outgoingGroups.set(key, [])
          outgoingGroups.get(key)!.push({ ...item, peerId })
        } else {
          allItems.push({ ...item, peerId })
        }
      }

      if (s.incoming) {
        allIncoming = allIncoming.concat(
          s.incoming.map((i) => ({ ...i, peerId })),
        )
      }
    }

    for (const group of outgoingGroups.values()) {
      const first = group[0]
      const totalBytesTransferred = group.reduce((sum, i) => sum + i.bytesTransferred, 0)
      const avgSpeed = group.reduce((sum, i) => sum + i.speed, 0) / group.length

      let unifiedStatus = "completed"
      if (group.some((i: any) => i.status === "progress")) unifiedStatus = "progress"
      else if (group.some((i: any) => i.status === "paused")) unifiedStatus = "paused"
      else if (group.some((i: any) => i.status === "pending")) unifiedStatus = "pending"
      else if (group.some((i: any) => i.status === "failed") && !group.some((i: any) => i.status === "completed")) unifiedStatus = "failed"
      else if (group.some((i: any) => i.status === "cancelled") && !group.some((i: any) => i.status === "completed")) unifiedStatus = "cancelled"

      allItems.push({
        ...first,
        status: unifiedStatus,
        bytesTransferred: totalBytesTransferred / group.length,
        speed: avgSpeed,
      })
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

  public sendFiles(
    files: File[],
    allPeerIds: string[],
    targetPeerId?: string,
  ): void {
    const overrideIds = Array.from({ length: files.length }, () =>
      makeTransferId(),
    )

    // Pre-create TransferManagers for any peers that we know about but haven't fired onDataChannel yet
    for (const peerId of allPeerIds) {
      if (!this.managers.has(peerId)) {
        const tm = new TransferManager()
        tm.subscribe((s) => this.aggregateState())
        tm.onEngineEvent((e) => {
          for (const listener of this.eventListeners) {
            listener(peerId, e)
          }
        })
        this.managers.set(peerId, tm)
      }
    }

    if (targetPeerId) {
      this.managers.get(targetPeerId)?.sendFiles(files, overrideIds)
    } else {
      // Fan-out to all
      for (const tm of this.managers.values()) {
        tm.sendFiles(files, overrideIds)
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

  private applyFanOutAction(
    id: string,
    peerId: string | undefined,
    action: (tm: TransferManager, targetId: string) => void
  ) {
    if (peerId) {
      const tm = this.managers.get(peerId)
      if (tm) action(tm, id)
      return
    }

    let targetName = ""
    let targetSize = 0
    let isSend = false

    for (const tm of this.managers.values()) {
      const item = tm.getState().items.find((i) => i.id === id)
      if (item) {
        targetName = item.name
        targetSize = item.size
        isSend = item.direction === "send"
        break
      }
    }

    if (isSend) {
      for (const tm of this.managers.values()) {
        const item = tm.getState().items.find(
          (i) => i.direction === "send" && i.name === targetName && i.size === targetSize
        )
        if (item) action(tm, item.id)
      }
    } else {
      for (const tm of this.managers.values()) {
        action(tm, id)
      }
    }
  }

  public pause(id: string, peerId?: string): void {
    this.applyFanOutAction(id, peerId, (tm, targetId) => tm.pause(targetId))
  }

  public resume(id: string, peerId?: string): void {
    this.applyFanOutAction(id, peerId, (tm, targetId) => tm.resume(targetId))
  }

  public cancel(id: string, peerId?: string): void {
    this.applyFanOutAction(id, peerId, (tm, targetId) => tm.cancel(targetId))
  }

  public retry(id: string, peerId?: string): void {
    this.applyFanOutAction(id, peerId, (tm, targetId) => tm.retry(targetId))
  }

  public remove(id: string, peerId?: string): void {
    this.applyFanOutAction(id, peerId, (tm, targetId) => tm.remove(targetId))
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
    this.managers.clear()
    this.state = { items: [], incoming: null }
  }
}
