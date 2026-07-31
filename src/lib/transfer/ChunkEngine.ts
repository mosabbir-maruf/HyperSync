import { encodeChunkInto, HEADER_SIZE } from "./protocol"
import { ChunkStrategy } from "./ChunkStrategy"
import type { ChunkHeader } from "./types"

/**
 * High-throughput chunk producer with N-deep parallel read-ahead.
 *
 * Design:
 * - Pre-allocates one send buffer for the lifetime of the transfer.
 *   channel.send() copies synchronously so the buffer is safely reused
 *   immediately after each send() call returns.
 * - Maintains LOOKAHEAD concurrent File.slice().arrayBuffer() Promises so
 *   disk I/O always overlaps with DataChannel drain time.
 * - Encodes the header in-place (zero extra allocation in the hot path).
 * - Yields a Uint8Array subarray view — channel.send(Uint8Array) is valid
 *   and avoids creating a new ArrayBuffer per chunk.
 */
export class ChunkEngine {
  public readonly chunkSize: number

  // Pre-allocated send buffer — one allocation for the entire transfer.
  // Safe to reuse: RTCDataChannel.send() copies synchronously before returning.
  private readonly _sendBuf: Uint8Array
  private readonly _sendDV: DataView

  constructor(
    private readonly file: Blob,
    private readonly transferId: string
  ) {
    this.chunkSize = ChunkStrategy.getOptimalChunkSize(file.size)
    const capacity = HEADER_SIZE + this.chunkSize
    const ab = new ArrayBuffer(capacity)
    this._sendBuf = new Uint8Array(ab)
    this._sendDV  = new DataView(ab)
  }

  public get chunkCount(): number {
    return Math.ceil(this.file.size / this.chunkSize)
  }

  async *generateChunks(
    signal: AbortSignal
  ): AsyncGenerator<{ header: ChunkHeader; wire: Uint8Array }, void, unknown> {
    const totalChunks = this.chunkCount
    if (totalChunks === 0) return

    // Number of concurrent reads in flight.
    // 4 = ~1MB pre-read at 256KB/chunk; enough to cover a 20ms disk-read
    // latency at 50 MB/s network speeds without excessive memory pressure.
    const LOOKAHEAD = Math.min(4, totalChunks)

    type Slot = {
      promise: Promise<ArrayBuffer>
      offset: number
      index: number
      length: number
    }

    const pipeline: Slot[] = []
    let readOffset = 0
    let readIndex  = 0

    const enqueue = () => {
      if (readIndex >= totalChunks) return
      const len = Math.min(this.chunkSize, this.file.size - readOffset)
      const off = readOffset
      pipeline.push({
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

    while (pipeline.length > 0) {
      if (signal.aborted) throw new Error("Transfer aborted")

      // Pull the oldest slot — it was started first and is most likely done
      const slot = pipeline.shift()!

      // Start the NEXT read before awaiting the current one (true overlap)
      enqueue()

      const data = await slot.promise

      const header: ChunkHeader = {
        transferId: this.transferId,
        chunkIndex: slot.index,
        offset: slot.offset,
        length: slot.length,
        isLastChunk: slot.index === totalChunks - 1
      }

      // Encode header + copy payload into the shared send buffer.
      // Returns a subarray view — no new ArrayBuffer allocated.
      const wire = encodeChunkInto(this._sendBuf, this._sendDV, header, data)

      yield { header, wire }
      // After yield returns (caller finished channel.send()), the buffer
      // is safe to overwrite on the next iteration.
    }
  }
}
