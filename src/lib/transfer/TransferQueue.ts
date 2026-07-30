import type { FileMetadata } from "./types"

export interface QueuedTransfer {
  metadata: FileMetadata;
  file?: File;
  direction: "send" | "receive";
}

export class TransferQueue {
  private queue: QueuedTransfer[] = [];
  
  add(transfer: QueuedTransfer) {
    this.queue.push(transfer);
  }

  remove(transferId: string) {
    this.queue = this.queue.filter(t => t.metadata.transferId !== transferId);
  }

  next(): QueuedTransfer | undefined {
    return this.queue.shift();
  }

  peek(): QueuedTransfer | undefined {
    return this.queue[0];
  }

  clear() {
    this.queue = [];
  }
  
  get items(): QueuedTransfer[] {
    return [...this.queue];
  }
}
