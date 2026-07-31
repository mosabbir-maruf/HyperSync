import { encodeChunk } from "./protocol"
import { ChunkStrategy } from "./ChunkStrategy"
import type { ChunkHeader } from "./types"

/**
 * Lazily slice a File into chunks and encode them into binary protocol buffers.
 *
 * Pipeline strategy: we read chunk N+1 from disk WHILE yielding chunk N to the
 * caller. This overlaps File I/O with DataChannel send + drain time, eliminating
 * the serial read-encode-send-wait-read-encode-send... stall that caps throughput
 * at (chunkSize / diskReadLatency) bytes/sec.
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

  private readChunk(offset: number): Promise<ArrayBuffer> {
    const length = Math.min(this.chunkSize, this.file.size - offset)
    return this.file.slice(offset, offset + length).arrayBuffer()
  }

  async *generateChunks(
    signal: AbortSignal
  ): AsyncGenerator<{ header: ChunkHeader; buffer: ArrayBuffer }, void, unknown> {
    const totalChunks = this.chunkCount
    if (totalChunks === 0) return

    let offset = 0
    let index = 0

    // Kick off the very first read immediately
    let pendingRead = this.readChunk(0)

    while (offset < this.file.size) {
      if (signal.aborted) throw new Error("Transfer aborted")

      const length = Math.min(this.chunkSize, this.file.size - offset)
      const data = await pendingRead

      const nextOffset = offset + length
      const nextIndex = index + 1

      // Start reading the NEXT chunk from disk NOW, before we yield this one.
      // This overlaps disk I/O with the caller's send + drain wait.
      if (nextOffset < this.file.size) {
        pendingRead = this.readChunk(nextOffset)
      }

      const isLastChunk = index === totalChunks - 1

      const header: ChunkHeader = {
        transferId: this.transferId,
        chunkIndex: index,
        offset,
        length,
        isLastChunk
      }

      const encodedBuffer: ArrayBuffer = encodeChunk(header, data)
      yield { header, buffer: encodedBuffer }

      offset = nextOffset
      index = nextIndex
    }
  }
}
