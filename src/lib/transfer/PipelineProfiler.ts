import { logger } from "../../services/Logger"

export interface PipelineMetrics {
  timestamp: number
  stage: "read" | "encode" | "decode" | "write"
  durationMs: number
  bytes: number
}

/**
 * Global profiler for tracking the latency of individual stages in the pipeline.
 * Emits moving averages so we can see which stage is blocking the event loop.
 */
export class PipelineProfiler {
  private static instance = new PipelineProfiler()

  static get() {
    return PipelineProfiler.instance
  }

  private subscribers = new Set<(metrics: PipelineMetrics) => void>()
  private stats = {
    read: { totalTime: 0, totalBytes: 0, count: 0 },
    encode: { totalTime: 0, totalBytes: 0, count: 0 },
    decode: { totalTime: 0, totalBytes: 0, count: 0 },
    write: { totalTime: 0, totalBytes: 0, count: 0 },
  }
  private timer: ReturnType<typeof setInterval> | null = null

  subscribe(callback: (metrics: PipelineMetrics) => void) {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  record(
    stage: "read" | "encode" | "decode" | "write",
    durationMs: number,
    bytes: number,
  ) {
    const s = this.stats[stage]
    s.totalTime += durationMs
    s.totalBytes += bytes
    s.count++

    const metrics: PipelineMetrics = {
      timestamp: performance.now(),
      stage,
      durationMs,
      bytes,
    }

    for (const cb of this.subscribers) cb(metrics)
  }

  getAveragesAndReset() {
    const result = {
      readMs: this.stats.read.count
        ? this.stats.read.totalTime / this.stats.read.count
        : 0,
      encodeMs: this.stats.encode.count
        ? this.stats.encode.totalTime / this.stats.encode.count
        : 0,
      decodeMs: this.stats.decode.count
        ? this.stats.decode.totalTime / this.stats.decode.count
        : 0,
      writeMs: this.stats.write.count
        ? this.stats.write.totalTime / this.stats.write.count
        : 0,
      readMBps: this.stats.read.totalTime
        ? this.stats.read.totalBytes /
          1024 /
          1024 /
          (this.stats.read.totalTime / 1000)
        : 0,
      encodeMBps: this.stats.encode.totalTime
        ? this.stats.encode.totalBytes /
          1024 /
          1024 /
          (this.stats.encode.totalTime / 1000)
        : 0,
      decodeMBps: this.stats.decode.totalTime
        ? this.stats.decode.totalBytes /
          1024 /
          1024 /
          (this.stats.decode.totalTime / 1000)
        : 0,
      writeMBps: this.stats.write.totalTime
        ? this.stats.write.totalBytes /
          1024 /
          1024 /
          (this.stats.write.totalTime / 1000)
        : 0,
    }

    this.stats = {
      read: { totalTime: 0, totalBytes: 0, count: 0 },
      encode: { totalTime: 0, totalBytes: 0, count: 0 },
      decode: { totalTime: 0, totalBytes: 0, count: 0 },
      write: { totalTime: 0, totalBytes: 0, count: 0 },
    }

    return result
  }

  startLogging() {
    if (this.timer) return
    if (!import.meta.env.DEV) return

    this.timer = setInterval(() => {
      const avg = this.getAveragesAndReset()
      if (avg.readMBps > 0 || avg.writeMBps > 0) {
        logger.debug(
          `Pipeline Telemetry:\n` +
          `  Read  : ${avg.readMBps.toFixed(2)} MB/s (${avg.readMs.toFixed(2)}ms avg)\n` +
          `  Encode: ${avg.encodeMBps.toFixed(2)} MB/s (${avg.encodeMs.toFixed(2)}ms avg)\n` +
          `  Decode: ${avg.decodeMBps.toFixed(2)} MB/s (${avg.decodeMs.toFixed(2)}ms avg)\n` +
          `  Write : ${avg.writeMBps.toFixed(2)} MB/s (${avg.writeMs.toFixed(2)}ms avg)`
        )
      }
    }, 2000)
  }

  stopLogging() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}
