import { encodeChunkInto, HEADER_SIZE } from "./protocol"
import { ChunkStrategy } from "./ChunkStrategy"
import type { SendPipeline } from "./SendPipeline"

/**
 * High-throughput chunk producer with N-deep parallel read-ahead.
 *
 * It reads from the File and pushes encoded buffers directly into the SendPipeline.
 */
export class ChunkEngine {
  public readonly chunkSize: number

  constructor(
    private readonly file: Blob,
    private readonly transferId: string
  ) {
    this.chunkSize = ChunkStrategy.getOptimalChunkSize(file.size)
  }

  public get chunkCount(): number {
    return Math.ceil(this.file.size / this.chunkSize)
  }

  /**
   * Run the producer loop.
   * Reads from disk (with LOOKAHEAD concurrency) and pushes to SendPipeline.
   */
  async pump(pipeline: SendPipeline, signal: AbortSignal): Promise<void> {
    const totalChunks = this.chunkCount
    if (totalChunks === 0) {
      pipeline.markEof()
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
    let readIndex  = 0

    const enqueue = () => {
      if (readIndex >= totalChunks) return
      const len = Math.min(this.chunkSize, this.file.size - readOffset)
      const off = readOffset
      readQueue.push({
        promise: this.file.slice(off, off + len).arrayBuffer(),
        offset: off,
        index: readIndex,
        length: len
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
      const data = await slot.promise
      if (signal.aborted) throw new Error("Transfer aborted")

      // 2. Wait for a free buffer from the network pipeline
      // (This applies natural backpressure if disk is faster than network)
      const pb = await pipeline.acquireBuffer()
      if (signal.aborted) throw new Error("Transfer aborted")

      const isLast = slot.index === totalChunks - 1

      // 3. Encode zero-copy into the acquired buffer
      const wire = encodeChunkInto(
        pb.view,
        new DataView(pb.view.buffer, pb.view.byteOffset, pb.view.byteLength),
        {
          transferId: this.transferId,
          chunkIndex: slot.index,
          offset: slot.offset,
          length: slot.length,
          isLastChunk: isLast
        },
        data
      )

      // 4. Push to consumer (which will immediately flush if channel has space)
      pipeline.push(pb, wire.length, slot.length, isLast)
    }

    pipeline.markEof()
  }
}
