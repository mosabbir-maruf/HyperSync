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

  subscribe(callback: (metrics: PipelineMetrics) => void) {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  record(stage: "read" | "encode" | "decode" | "write", durationMs: number, bytes: number) {
    const s = this.stats[stage]
    s.totalTime += durationMs
    s.totalBytes += bytes
    s.count++

    const metrics: PipelineMetrics = {
      timestamp: performance.now(),
      stage,
      durationMs,
      bytes
    }
    
    for (const cb of this.subscribers) cb(metrics)
  }

  getAveragesAndReset() {
    const result = {
      readMs: this.stats.read.count ? this.stats.read.totalTime / this.stats.read.count : 0,
      encodeMs: this.stats.encode.count ? this.stats.encode.totalTime / this.stats.encode.count : 0,
      decodeMs: this.stats.decode.count ? this.stats.decode.totalTime / this.stats.decode.count : 0,
      writeMs: this.stats.write.count ? this.stats.write.totalTime / this.stats.write.count : 0,
      readMBps: this.stats.read.totalTime ? (this.stats.read.totalBytes / 1024 / 1024) / (this.stats.read.totalTime / 1000) : 0,
      encodeMBps: this.stats.encode.totalTime ? (this.stats.encode.totalBytes / 1024 / 1024) / (this.stats.encode.totalTime / 1000) : 0,
      decodeMBps: this.stats.decode.totalTime ? (this.stats.decode.totalBytes / 1024 / 1024) / (this.stats.decode.totalTime / 1000) : 0,
      writeMBps: this.stats.write.totalTime ? (this.stats.write.totalBytes / 1024 / 1024) / (this.stats.write.totalTime / 1000) : 0,
    }

    this.stats = {
      read: { totalTime: 0, totalBytes: 0, count: 0 },
      encode: { totalTime: 0, totalBytes: 0, count: 0 },
      decode: { totalTime: 0, totalBytes: 0, count: 0 },
      write: { totalTime: 0, totalBytes: 0, count: 0 },
    }

    return result
  }
}
