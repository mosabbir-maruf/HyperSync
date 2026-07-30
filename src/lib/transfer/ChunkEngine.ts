import { encodeChunk } from "./protocol"
import { ChunkStrategy } from "./ChunkStrategy"
import type { ChunkHeader } from "./types"

/**
 * Lazily slice a File into chunks and encode them into binary protocol buffers.
 * Never loads the whole file into memory.
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

  async *generateChunks(
    signal: AbortSignal
  ): AsyncGenerator<{ header: ChunkHeader; buffer: ArrayBuffer }, void, unknown> {
    let offset = 0
    let index = 0
    const totalChunks = this.chunkCount

    while (offset < this.file.size) {
      if (signal.aborted) throw new Error("Transfer aborted")

      const length = Math.min(this.chunkSize, this.file.size - offset)
      const slice = this.file.slice(offset, offset + length)
      
      // Load only this chunk into memory
      const data: ArrayBuffer = await slice.arrayBuffer()

      const isLastChunk = index === totalChunks - 1

      const header: ChunkHeader = {
        transferId: this.transferId,
        chunkIndex: index,
        offset,
        length,
        isLastChunk
      }

      let encodedBuffer: ArrayBuffer | null = encodeChunk(header, data)
      yield { header, buffer: encodedBuffer }

      encodedBuffer = null
      offset += length
      index++
    }
  }
}
