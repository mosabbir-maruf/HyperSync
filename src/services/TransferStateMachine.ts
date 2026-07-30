import type { TransferLifecycle } from "../domain/transfer"

const transitions: Readonly<Record<TransferLifecycle, readonly TransferLifecycle[]>> =
  {
    queued: ["pending", "cancelled", "failed"],
    pending: ["running", "cancelled", "failed"],
    running: ["paused", "completed", "cancelled", "failed"],
    paused: ["running", "cancelled", "failed"],
    completed: [],
    failed: ["queued", "pending", "cancelled"],
    cancelled: [],
  }

export class TransferStateMachine {
  canTransition(from: TransferLifecycle, to: TransferLifecycle): boolean {
    return transitions[from].includes(to)
  }

  transition(
    from: TransferLifecycle,
    to: TransferLifecycle,
  ): TransferLifecycle {
    if (!this.canTransition(from, to)) {
      throw new Error(`Invalid transfer transition: ${from} → ${to}`)
    }
    return to
  }
}
