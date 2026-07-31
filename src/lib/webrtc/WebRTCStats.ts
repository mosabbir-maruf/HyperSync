export interface WebRTCMetrics {
  timestamp: number
  bytesSent: number
  bytesReceived: number
  packetsSent: number
  packetsReceived: number
  packetsLost: number
  currentRoundTripTime?: number // RTT in seconds (usually)
  availableOutgoingBitrate?: number // Bits per second
  availableIncomingBitrate?: number
}

export class WebRTCStatsCollector {
  private timer: ReturnType<typeof setInterval> | null = null
  private lastMetrics: WebRTCMetrics | null = null
  private subscribers = new Set<(metrics: WebRTCMetrics) => void>()

  constructor(private readonly pc: RTCPeerConnection) {}

  start(intervalMs = 1000) {
    if (this.timer) return
    this.timer = setInterval(() => this.collect(), intervalMs)
    void this.collect()
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  subscribe(callback: (metrics: WebRTCMetrics) => void) {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  private async collect() {
    if (this.pc.signalingState === "closed") {
      this.stop()
      return
    }

    try {
      const stats = await this.pc.getStats()
      let bytesSent = 0
      let bytesReceived = 0
      let packetsSent = 0
      let packetsReceived = 0
      let packetsLost = 0
      let currentRoundTripTime: number | undefined
      let availableOutgoingBitrate: number | undefined
      let availableIncomingBitrate: number | undefined

      stats.forEach((report) => {
        if (report.type === "transport") {
          bytesSent += report.bytesSent || 0
          bytesReceived += report.bytesReceived || 0
        }
        if (report.type === "candidate-pair" && report.state === "succeeded") {
          currentRoundTripTime = report.currentRoundTripTime
          availableOutgoingBitrate = report.availableOutgoingBitrate
          availableIncomingBitrate = report.availableIncomingBitrate
        }
        if (report.type === "data-channel") {
          bytesSent += report.bytesSent || 0
          bytesReceived += report.bytesReceived || 0
        }
      })

      const metrics: WebRTCMetrics = {
        timestamp: performance.now(),
        bytesSent,
        bytesReceived,
        packetsSent,
        packetsReceived,
        packetsLost,
        currentRoundTripTime,
        availableOutgoingBitrate,
        availableIncomingBitrate,
      }

      this.lastMetrics = metrics
      for (const cb of this.subscribers) {
        cb(metrics)
      }
    } catch (e) {
      console.warn("Failed to collect WebRTC stats", e)
    }
  }

  getLastMetrics() {
    return this.lastMetrics
  }
}
