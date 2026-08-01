import { decodeChunk } from "./protocol"
import { DownloadManager } from "./DownloadManager"
import type { SaveProvider } from "./SaveProvider"
import type { FileMetadata, TransferProgress } from "./types"
import { RateMeter } from "./rateMeter"
import { PipelineProfiler } from "./PipelineProfiler"

/**
 * Receives ordered binary chunks over a DataChannel and streams them to a
 * SaveProvider (FileSystem API or in-memory Blob accumulator).
 *
 * Design principles:
 * - handleChunk() is synchronous — it decodes the header (cheap) and appends
 *   an async write to a serial promise chain, then returns immediately.
 *   This means the message-processing loop never blocks on disk I/O.
 * - decodeChunk() returns a zero-copy Uint8Array view into the received
 *   ArrayBuffer. The sink receives this view directly — no extra 256KB copy.
 * - Progress is sampled at most every 100 ms (≈10 fps) to avoid flooding
 *   React with re-renders during high-throughput transfers.
 */
export class ChunkReceiver {
  private sink: SaveProvider | null = null
  private meter: RateMeter
  private bytesReceived = 0
  private chunksReceived = 0
  private lastProgressTime = 0
  private isAborted = false

  // Serial write chain: each chunk write appends to this promise so writes
  // arrive at the sink in order even if individual writes are async.
  private writeChain: Promise<void> = Promise.resolve()

  private readonly abortHandler = () => {
    this.abort()
  }

  constructor(
    private readonly meta: FileMetadata,
    private readonly signal: AbortSignal,
    private readonly onProgress: (progress: TransferProgress) => void,
    private readonly onComplete: (downloadUrl?: string, blob?: Blob) => void,
    private readonly onError: (error: string) => void,
    private readonly onEvent?: (
      event: "DownloadStarted" | "VerificationStarted" | "VerificationFinished",
    ) => void,
  ) {
    this.meter = new RateMeter(meta.fileSize)
    this.signal.addEventListener("abort", this.abortHandler)
  }

  async initialize() {
    try {
      this.sink = await DownloadManager.createSaveProvider(this.meta)
      this.meter.start()
    } catch (err) {
      this.onError(
        err instanceof Error ? err.message : "Failed to initialize sink",
      )
    }
  }

  /**
   * Process one incoming binary message.
   *
   * Synchronous — decodes header, appends write to the chain, samples
   * progress, and returns immediately. The DataChannel onmessage loop is
   * never blocked waiting for a disk write to complete.
   */
  handleChunk(buffer: ArrayBuffer): void {
    if (this.isAborted || !this.sink) return

    let header: ReturnType<typeof decodeChunk>["header"]
    let data: Uint8Array

    try {
      const t0 = performance.now()
      const decoded = decodeChunk(buffer)
      const t1 = performance.now()
      header = decoded.header
      data = decoded.data
      PipelineProfiler.get().record("decode", t1 - t0, header.length)
    } catch {
      return // malformed frame — drop silently
    }

    if (header.transferId !== this.meta.transferId) return

    // Append write to the serial chain (fire-and-forget)
    const sink = this.sink
    this.writeChain = (this.writeChain
      .then(async () => {
        if (!this.isAborted) {
          const t0 = performance.now()
          await sink.write(data, header.offset)
          const t1 = performance.now()
          PipelineProfiler.get().record("write", t1 - t0, header.length)
        }
      })
      .catch((err: unknown) => {
        if (this.isAborted) return
        this.abort()
        this.onError(err instanceof Error ? err.message : "Disk write failed")
      }) as Promise<void>)

    this.bytesReceived += header.length
    this.chunksReceived += 1

    // Throttle progress to 50 ms (20 fps) — smooth UI without render flood
    const now = performance.now()
    if (now - this.lastProgressTime > 50 || header.isLastChunk) {
      this.lastProgressTime = now
      const { speed, eta } = this.meter.sample(this.bytesReceived)
      this.onProgress({
        transferId: this.meta.transferId,
        bytesSent: 0,
        bytesReceived: this.bytesReceived,
        chunksSent: 0,
        chunksReceived: this.chunksReceived,
        totalBytes: this.meta.fileSize,
        totalChunks: this.meta.chunkCount,
        percentage: (this.bytesReceived / this.meta.fileSize) * 100,
        speedBytesPerSecond: speed,
        estimatedTimeRemainingSeconds: eta ?? 0,
      })
    }
  }

  async complete(expectedChecksum?: string) {
    this.signal.removeEventListener("abort", this.abortHandler)
    if (this.isAborted || !this.sink) return
    try {
      // Drain all pending writes before closing
      await this.writeChain
      this.onEvent?.("DownloadStarted")
      const result = await this.sink.close()

      if (expectedChecksum && result.blob) {
        this.onEvent?.("VerificationStarted")
        // Lazy-import to avoid bundling crypto in the hot path
        const { integrityService } = await import("./IntegrityService")
        const isValid = await integrityService.verifyChecksum(
          result.blob,
          expectedChecksum,
        )
        this.onEvent?.("VerificationFinished")
        if (!isValid) {
          this.onError("Checksum verification failed")
          return
        }
      }

      this.onComplete(result.downloadUrl, result.blob)
    } catch (err) {
      this.onError(
        err instanceof Error ? err.message : "Failed to close save provider",
      )
    }
  }

  abort() {
    this.signal.removeEventListener("abort", this.abortHandler)
    if (this.isAborted) return
    this.isAborted = true
    if (this.sink) void this.sink.abort()
  }
}
