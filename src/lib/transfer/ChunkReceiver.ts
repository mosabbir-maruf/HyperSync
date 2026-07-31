import { decodeChunk } from "./protocol"
import { DownloadManager } from "./DownloadManager"
import type { SaveProvider } from "./SaveProvider"
import type { FileMetadata, TransferProgress } from "./types"
import { RateMeter } from "./rateMeter"
import { integrityService } from "./IntegrityService"

export class ChunkReceiver {
  private sink: SaveProvider | null = null
  private meter: RateMeter
  private bytesReceived = 0
  private chunksReceived = 0
  private lastProgressTime = 0
  private isAborted = false
  private writeChain: Promise<void> = Promise.resolve()

  private abortHandler = () => {
    this.abort()
    this.onError("Transfer aborted by receiver")
  }

  constructor(
    private readonly meta: FileMetadata,
    private readonly signal: AbortSignal,
    private readonly onProgress: (progress: TransferProgress) => void,
    private readonly onComplete: (downloadUrl?: string, blob?: Blob) => void,
    private readonly onError: (error: string) => void,
    private readonly onEvent?: (event: "DownloadStarted" | "VerificationStarted" | "VerificationFinished") => void
  ) {
    this.meter = new RateMeter(meta.fileSize)
    this.signal.addEventListener("abort", this.abortHandler)
  }

  async initialize() {
    try {
      this.sink = await DownloadManager.createSaveProvider(this.meta)
      this.meter.start()
    } catch (err) {
      this.onError(err instanceof Error ? err.message : "Failed to initialize sink")
    }
  }

  async handleChunk(buffer: ArrayBuffer) {
    if (this.isAborted || !this.sink) return

    try {
      const { header, data } = decodeChunk(buffer)
      
      if (header.transferId !== this.meta.transferId) {
        throw new Error("Chunk transferId mismatch")
      }

      const sink = this.sink
      this.writeChain = this.writeChain.then(async () => {
        if (!this.isAborted) {
          await sink.write(data, header.offset)
        }
      }).catch(err => {
        this.abort()
        this.onError(err instanceof Error ? err.message : "Disk write failed")
      })

      this.bytesReceived += header.length
      this.chunksReceived++

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
          estimatedTimeRemainingSeconds: eta ?? 0
        })
      }

    } catch (err) {
      this.abort()
      this.onError(err instanceof Error ? err.message : "Failed to process chunk")
    }
  }

  async complete(expectedChecksum?: string) {
    this.signal.removeEventListener("abort", this.abortHandler)
    if (this.isAborted || !this.sink) return
    try {
      await this.writeChain
      this.onEvent?.("DownloadStarted")
      const result = await this.sink.close()
      
      if (expectedChecksum && result.blob) {
        this.onEvent?.("VerificationStarted")
        const isValid = await integrityService.verifyChecksum(result.blob, expectedChecksum)
        this.onEvent?.("VerificationFinished")
        if (!isValid) {
          this.onError("Checksum verification failed")
          return
        }
      }
      
      this.onComplete(result.downloadUrl, result.blob)
    } catch (err) {
      this.onError(err instanceof Error ? err.message : "Failed to close save provider")
    }
  }

  abort() {
    this.signal.removeEventListener("abort", this.abortHandler)
    if (this.isAborted) return
    this.isAborted = true
    if (this.sink) {
      void this.sink.abort()
    }
  }
}
