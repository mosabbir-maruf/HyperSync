export type TransferLifecycle = "queued" | "pending" | "running" | "paused" | "completed" | "failed" | "cancelled"

export const terminalTransferStates: ReadonlySet<TransferLifecycle> = new Set([
  "completed",
  "failed",
  "cancelled",
])
