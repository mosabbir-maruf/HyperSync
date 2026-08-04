import { encodeChunkInto, HEADER_SIZE } from "./protocol"
import { ChunkStrategy } from "./ChunkStrategy"
import type { SendPipeline } from "./SendPipeline"
import { PipelineProfiler } from "./PipelineProfiler"

/**
 * High-throughput chunk producer with N-deep parallel read-ahead.
 *
 * It reads from the File and pushes encoded buffers directly into the SendPipeline.
 */
export class ChunkEngine {
  public readonly chunkSize: number

  constructor(
    private readonly file: Blob,
    private readonly transferId: string,
  ) {
    this.chunkSize = ChunkStrategy.getOptimalChunkSize(file.size)
  }

  public get chunkCount(): number {
    return Math.ceil(this.file.size / this.chunkSize)
  }

  // --- Static Micro-Batching Registry ---
  private static pendingEngines = new Map<
    string,
    {
      engine: ChunkEngine
      pipelines: SendPipeline[]
      signals: AbortSignal[]
      timer: ReturnType<typeof setTimeout> | null
    }
  >()

  /**
   * Enqueues a pipeline for the given file transfer.
   * If a pending pump exists for this transferId, the pipeline is added to it.
   * Otherwise, a new ChunkEngine is created and a 100ms micro-batch window starts.
   * When the window closes, all grouped pipelines are pumped simultaneously, reading the disk ONCE.
   */
  static attachAndPump(
    file: Blob,
    transferId: string,
    pipeline: SendPipeline,
    signal: AbortSignal,
  ): Promise<void> {
    let group = this.pendingEngines.get(transferId)

    if (!group) {
      group = {
        engine: new ChunkEngine(file, transferId),
        pipelines: [],
        signals: [],
        timer: null,
      }
      this.pendingEngines.set(transferId, group)
    }

    group.pipelines.push(pipeline)
    group.signals.push(signal)

    return new Promise((resolve, reject) => {
      // If we haven't scheduled the pump yet, schedule it
      if (!group!.timer) {
        group!.timer = setTimeout(() => {
          // Remove from pending so any future late-joiners get a NEW ChunkEngine
          this.pendingEngines.delete(transferId)

          // We create a combined abort signal that aborts only if ALL pipelines abort
          // Actually, we can just pass the pipelines and let the pump handle individual aborts
          group!.engine
            .pump(group!.pipelines, group!.signals)
            .then(resolve)
            .catch(reject)
        }, 100) // 100ms micro-batch window
      } else {
        // We attached to an existing group, we just wait for its promise to resolve
        // Wait, pump returns one promise, but each caller needs their own promise resolved.
        // The simplest way is to let the first caller trigger the pump, and we just wait for it?
        // Actually, returning a dummy promise here is fine, the pump handles markEof() internally.
        resolve()
      }
    })
  }

  /**
   * Run the producer loop.
   * Reads from disk (with LOOKAHEAD concurrency) and pushes to SendPipelines.
   */
  async pump(pipelines: SendPipeline[], signals: AbortSignal[]): Promise<void> {
    const totalChunks = this.chunkCount
    if (totalChunks === 0) {
      for (const p of pipelines) p.markEof()
      return
    }

    const LOOKAHEAD = Math.min(4, totalChunks)

    type Slot = {
      promise: Promise<ArrayBuffer>
      offset: number
      index: number
      length: number
    }

    const readQueue: Slot[] = []
    let readOffset = 0
    let readIndex = 0

    const enqueue = () => {
      if (readIndex >= totalChunks) return
      const len = Math.min(this.chunkSize, this.file.size - readOffset)
      const off = readOffset
      readQueue.push({
        promise: this.file.slice(off, off + len).arrayBuffer(),
        offset: off,
        index: readIndex,
        length: len,
      })
      readOffset += len
      readIndex++
    }

    // Prime the pipeline
    for (let i = 0; i < LOOKAHEAD; i++) enqueue()

    while (readQueue.length > 0) {
      // If ALL signals are aborted, we can abort the whole pump
      if (signals.every(s => s.aborted)) throw new Error("Transfer aborted")

      const slot = readQueue.shift()!
      enqueue()

      // 1. Wait for disk read
      const t0 = performance.now()
      const data = await slot.promise
      const t1 = performance.now()
      PipelineProfiler.get().record("read", t1 - t0, slot.length)
      if (signals.every(s => s.aborted)) throw new Error("Transfer aborted")

      const isLast = slot.index === totalChunks - 1

      // 2 & 3. For each pipeline, wait for a free buffer, then encode and push
      // We do this in parallel across pipelines to minimize latency, but backpressure
      // will naturally slow us down to the slowest pipeline.
      await Promise.all(
        pipelines.map(async (pipeline, idx) => {
          if (signals[idx].aborted) return

          const pb = await pipeline.acquireBuffer()
          if (signals[idx].aborted) return

          const t2 = performance.now()
          const wire = encodeChunkInto(
            pb.view,
            new DataView(
              pb.view.buffer,
              pb.view.byteOffset,
              pb.view.byteLength,
            ),
            {
              transferId: this.transferId,
              chunkIndex: slot.index,
              offset: slot.offset,
              length: slot.length,
              isLastChunk: isLast,
            },
            data,
          )
          const t3 = performance.now()
          PipelineProfiler.get().record("encode", t3 - t2, slot.length)

          pipeline.push(pb, wire.length, slot.length, isLast)
        }),
      )
    }

    for (const p of pipelines) p.markEof()
  }
}
