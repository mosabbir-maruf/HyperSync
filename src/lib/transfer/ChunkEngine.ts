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

  /**
   * Run the producer loop.
   * Reads from disk (with LOOKAHEAD concurrency) and pushes to SendPipelines.
   */
  async pump(pipelines: SendPipeline[], signal: AbortSignal): Promise<void> {
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
      if (signal.aborted) throw new Error("Transfer aborted")

      const slot = readQueue.shift()!
      enqueue()

      // 1. Wait for disk read
      const t0 = performance.now()
      const data = await slot.promise
      const t1 = performance.now()
      PipelineProfiler.get().record("read", t1 - t0, slot.length)
      if (signal.aborted) throw new Error("Transfer aborted")

      const isLast = slot.index === totalChunks - 1

      // 2 & 3. For each pipeline, wait for a free buffer, then encode and push
      // We do this in parallel across pipelines to minimize latency, but backpressure
      // will naturally slow us down to the slowest pipeline.
      await Promise.all(
        pipelines.map(async (pipeline) => {
          if (signal.aborted) return

          const pb = await pipeline.acquireBuffer()
          if (signal.aborted) return

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
