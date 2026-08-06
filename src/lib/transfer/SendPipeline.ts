import { HIGH_WATER_MARK, HEADER_SIZE } from "./protocol"
import type { FileMetadata, TransferProgress } from "./types"
import { RateMeter } from "./rateMeter"
import { logger } from "../../services/Logger"

/**
 * SendPipeline: production-grade WebRTC DataChannel sender.
 *
 * ── Why the "for-await → send one chunk → await again" pattern creates sawtooth ──
 *
 * The naïve loop:
 *   for await (chunk of reader) { await awaitDrain(); channel.send(chunk) }
 *
 * sends ONE chunk per `bufferedamountlow` event. After each send the generator
 * suspends to await the next disk read. During that disk I/O the channel has
 * empty capacity but is NOT being filled → idle gap → throughput dip.
 *
 * ── Solution: decouple disk reading from channel writing ─────────────────────
 *
 * Producer coroutine (async):
 *   Reads and encodes chunks continuously into a bounded buffer pool.
 *   If pool is exhausted (consumer slower than producer) it parks until
 *   the consumer returns a buffer.
 *
 * Consumer (synchronous, event-driven):
 *   Called on every `bufferedamountlow` event AND on every push().
 *   Drains the ENTIRE queue into the DataChannel in one tight loop.
 *   Returning all used buffers to the pool immediately.
 *
 * Result: on every `bufferedamountlow` event we fill the channel back to
 * HIGH_WATER_MARK in one synchronous burst — no disk I/O in the critical path
 * because the producer pre-encoded those chunks already.
 *
 * ── Buffer pool ──────────────────────────────────────────────────────────────
 *
 * Pre-allocating N = ⌈(HIGH - LOW) / chunkSize⌉ buffers eliminates all
 * ArrayBuffer allocations during the transfer. GC has nothing to collect.
 *
 * ── Metrics ──────────────────────────────────────────────────────────────────
 *
 * Lightweight stats logged every 2 s:
 *   - send rate (MB/s)       : observed throughput
 *   - channel fill %         : average bufferedAmount / HIGH_WATER_MARK
 *   - queue starves          : consumer found queue empty → producer is behind
 *   - pool exhausts          : producer waited for a free buffer → consumer is behind
 *   - sender idle ms         : time since last channel.send() call
 */

/** One pre-allocated send buffer in the pool. */
export interface PooledBuffer {
  view: Uint8Array
}

interface QItem {
  pb: PooledBuffer
  wireLen: number // total bytes to send (header + payload)
  payloadLen: number
  isLast: boolean
}

export class SendPipeline {
  // ── Buffer pool ─────────────────────────────────────────────────────────
  private readonly pool: PooledBuffer[]
  private readonly poolWaiters: Array<() => void> = []

  // ── Send queue ──────────────────────────────────────────────────────────
  private readonly queue: QItem[] = []

  // ── Completion tracking ─────────────────────────────────────────────────
  private producerDone = false
  private isAllSent = false
  private readonly allSentResolvers: Array<() => void> = []

  // ── Flow Control ─────────────────────────────────────────────────────────
  private paused = false

  // ── Progress ────────────────────────────────────────────────────────────
  private readonly meter: RateMeter
  private bytesSent = 0
  private chunksSent = 0
  private lastProgressMs = 0

  // ── Metrics ─────────────────────────────────────────────────────────────
  private lastSendTime = performance.now()
  private queueStarves = 0
  private poolExhausts = 0
  private backpressureWaitMs = 0
  private lastChunksSent = 0
  private fillSamples: number[] = []
  private metricsTimer: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly channel: RTCDataChannel,
    private readonly meta: FileMetadata,
    readonly chunkSize: number,
    private readonly onProgress: (p: TransferProgress) => void,
  ) {
    this.meter = new RateMeter(meta.fileSize)
    this.meter.start()

    // Pool size: enough buffers to fill the entire HIGH-LOW gap without stalling.
    // (HIGH_WATER_MARK - LOW_WATER_MARK) / chunkSize, plus 4 headroom.
    const { HIGH_WATER_MARK: H, LOW_WATER_MARK: L } = SendPipeline
    const gapChunks = Math.ceil((H - L) / chunkSize)
    const poolSize = gapChunks + 4 // e.g. 8MB-4MB=4MB/256KB=16 + 4 = 20

    const wireCapacity = HEADER_SIZE + chunkSize
    this.pool = Array.from({ length: poolSize }, () => ({
      view: new Uint8Array(new ArrayBuffer(wireCapacity)),
    }))

    // Wire the consumer to the DataChannel — stays active for the whole transfer
    this.channel.addEventListener("bufferedamountlow", this._flush)

    // Periodic diagnostic logging
    if (import.meta.env.DEV) {
      this.metricsTimer = setInterval(() => this._logMetrics(), 2000)
    }
  }

  // Import watermarks as statics so they can be read without an instance
  static readonly HIGH_WATER_MARK = HIGH_WATER_MARK
  static readonly LOW_WATER_MARK =
    1 * 1024 * 1024 // keep in sync with protocol.ts

  // ── Producer API ─────────────────────────────────────────────────────────

  /**
   * Acquire a free pool buffer. May suspend if all buffers are currently
   * queued or in-flight. Suspension time = consumer drain rate → natural
   * backpressure without any busy-wait or sleep.
   */
  async acquireBuffer(): Promise<PooledBuffer> {
    if (this.pool.length > 0) return this.pool.pop()!
    this.poolExhausts++
    const startWait = performance.now()
    await new Promise<void>((r) => this.poolWaiters.push(r))
    this.backpressureWaitMs += performance.now() - startWait
    return this.pool.pop()!
  }

  /**
   * Enqueue an encoded chunk (already written into `pb.view[0..wireLen]`).
   * Immediately attempts a flush — if the channel has capacity right now,
   * this chunk is sent before the method returns.
   */
  push(
    pb: PooledBuffer,
    wireLen: number,
    payloadLen: number,
    isLast: boolean,
  ): void {
    this.queue.push({ pb, wireLen, payloadLen, isLast })
    this._flush()
  }

  /** Signal that no more chunks will be pushed. */
  markEof(): void {
    this.producerDone = true
    this._flush()
  }

  /** Resolves when every chunk has been handed to channel.send(). */
  waitUntilDone(): Promise<void> {
    if (this.isAllSent) return Promise.resolve()
    return new Promise<void>((r) => this.allSentResolvers.push(r))
  }

  /** Call after waitUntilDone() to free event listeners and timers. */
  destroy(): void {
    this.channel.removeEventListener("bufferedamountlow", this._flush)
    if (this.metricsTimer !== null) {
      clearInterval(this.metricsTimer)
      this.metricsTimer = null
    }
    // Resolve any stuck waiters (e.g. if we were aborted)
    for (const r of this.allSentResolvers) r()
    this.allSentResolvers.length = 0
    for (const r of this.poolWaiters) r()
    this.poolWaiters.length = 0
  }

  // ── Consumer (synchronous, event-driven) ─────────────────────────────────

  /**
   * Drain the queue into the DataChannel synchronously.
   *
   * Arrow function so it can be used as an event listener without .bind().
   * Called from two places:
   *   1. push()             — try immediate send on each new chunk
   *   2. bufferedamountlow  — fill back up when channel drains to LOW
   *
   * Sends as many chunks as fit (bufferedAmount < HIGH_WATER_MARK).
   * Never blocks. Never awaits. Never calls setTimeout.
   */
  private _flush = (): void => {
    if (this.paused) return

    // Sample fill level for metrics (cheap: just a number read)
    this.fillSamples.push(this.channel.bufferedAmount)

    if (this.queue.length === 0) {
      // Queue is empty when the consumer fires — producer hasn't caught up yet
      if (!this.producerDone) this.queueStarves++
      this._checkDone()
      return
    }

    const now = performance.now()

    while (
      this.queue.length > 0 &&
      this.channel.bufferedAmount < HIGH_WATER_MARK
    ) {
      const item = this.queue.shift()!

      // channel.send() copies bytes into SCTP buffer synchronously.
      // After this call the buffer is safe to reuse immediately.
      this.channel.send(item.pb.view.subarray(0, item.wireLen) as any)
      this.lastSendTime = now

      this.bytesSent += item.payloadLen
      this.chunksSent += 1

      // Return buffer to pool and wake any parked producer immediately
      this.pool.push(item.pb)
      const waiter = this.poolWaiters.shift()
      if (waiter) waiter()

      // Throttled progress emission (50 ms = 20 fps)
      if (now - this.lastProgressMs > 50 || item.isLast) {
        this.lastProgressMs = now
        const { speed, eta } = this.meter.sample(this.bytesSent)
        this.onProgress({
          transferId: this.meta.transferId,
          bytesSent: this.bytesSent,
          bytesReceived: 0,
          chunksSent: this.chunksSent,
          chunksReceived: 0,
          totalBytes: this.meta.fileSize,
          totalChunks: this.meta.chunkCount,
          percentage: (this.bytesSent / this.meta.fileSize) * 100,
          speedBytesPerSecond: speed,
          estimatedTimeRemainingSeconds: eta ?? 0,
        })
      }
    }

    this._checkDone()
  }

  private _checkDone(): void {
    if (this.producerDone && this.queue.length === 0 && !this.isAllSent) {
      this.isAllSent = true
      for (const r of this.allSentResolvers) r()
      this.allSentResolvers.length = 0
    }
  }

  public pause(): void {
    this.paused = true
  }

  public resume(): void {
    this.paused = false
    this._flush()
  }

  // ── Diagnostics ──────────────────────────────────────────────────────────

  private _logMetrics(): void {
    if (this.bytesSent === 0) return

    const n = this.fillSamples.length
    const avgFill = n > 0 ? this.fillSamples.reduce((a, b) => a + b, 0) / n : 0
    this.fillSamples = []

    const idleMs = performance.now() - this.lastSendTime
    const { speed } = this.meter.sample(this.bytesSent)
    const fillPct = ((avgFill / HIGH_WATER_MARK) * 100).toFixed(0)
    const rateMBps = (speed / 1_000_000).toFixed(1)
    const queueDepth = this.queue.length
    const freeBuffers = this.pool.length
    
    const chunksDelta = this.chunksSent - this.lastChunksSent
    this.lastChunksSent = this.chunksSent

    logger.debug(
      `SendPipeline: ${rateMBps} MB/s  fill=${fillPct}%` +
        `  queue=${queueDepth}  pool=${freeBuffers}` +
        `  idle=${idleMs.toFixed(0)}ms` +
        `  starves=${this.queueStarves} exhausts=${this.poolExhausts}` +
        `  wait=${this.backpressureWaitMs.toFixed(0)}ms` +
        `  freq=${(chunksDelta / 2).toFixed(1)}Hz`,
    )

    // Diagnose the bottleneck and hint in the log
    if (this.queueStarves > 0 && this.poolExhausts === 0) {
      logger.debug(
        "⚠ Producer (disk) is slower than network — increase read-ahead",
      )
    } else if (this.poolExhausts > 0 && this.queueStarves === 0) {
      logger.debug(
        "⚠ Network is slower than disk — pool/watermarks may be oversized",
      )
    } else if (idleMs > 20) {
      logger.debug(
        `⚠ Sender idle ${idleMs.toFixed(0)}ms — possible stall`,
      )
    }

    // Reset interval counters
    this.queueStarves = 0
    this.poolExhausts = 0
    this.backpressureWaitMs = 0
  }
}
