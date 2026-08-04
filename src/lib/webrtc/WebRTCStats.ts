export interface WebRTCMetrics {
  timestamp: number
  bytesSent: number
  bytesReceived: number
  packetsSent: number
  packetsReceived: number
  packetsLost: number
  currentRoundTripTime?: number // RTT in seconds
  availableOutgoingBitrate?: number // Bits per second
  availableIncomingBitrate?: number
  localCandidateType?: string
  localCandidateProtocol?: string
  remoteCandidateType?: string
  remoteCandidateProtocol?: string
}

export class WebRTCStatsCollector {
  private timer: ReturnType<typeof setInterval> | null = null
  private lastMetrics: WebRTCMetrics | null = null
  private subscribers = new Set<(metrics: WebRTCMetrics) => void>()
  private lastBytesSent = 0
  private lastBytesReceived = 0
  private lastTimestamp = 0

  constructor(
    private readonly pc: RTCPeerConnection,
    private readonly peerId: string = "unknown",
  ) {}

  start(intervalMs = 2000) {
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
      
      let selectedCandidatePairId = ""
      let localCandidateId = ""
      let remoteCandidateId = ""

      stats.forEach((report) => {
        if (report.type === "transport") {
          bytesSent += report.bytesSent || 0
          bytesReceived += report.bytesReceived || 0
          if (report.selectedCandidatePairId) {
            selectedCandidatePairId = report.selectedCandidatePairId
          }
        }
        if (report.type === "candidate-pair" && report.state === "succeeded") {
          if (!selectedCandidatePairId) selectedCandidatePairId = report.id
          if (report.id === selectedCandidatePairId) {
            currentRoundTripTime = report.currentRoundTripTime
            availableOutgoingBitrate = report.availableOutgoingBitrate
            availableIncomingBitrate = report.availableIncomingBitrate
            localCandidateId = report.localCandidateId || ""
            remoteCandidateId = report.remoteCandidateId || ""
          }
        }
      })

      let localCandidateType: string | undefined
      let localCandidateProtocol: string | undefined
      let remoteCandidateType: string | undefined
      let remoteCandidateProtocol: string | undefined

      if (localCandidateId) {
        const local = stats.get(localCandidateId)
        if (local) {
          localCandidateType = local.candidateType
          localCandidateProtocol = local.protocol
        }
      }
      if (remoteCandidateId) {
        const remote = stats.get(remoteCandidateId)
        if (remote) {
          remoteCandidateType = remote.candidateType
          remoteCandidateProtocol = remote.protocol
        }
      }

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
        localCandidateType,
        localCandidateProtocol,
        remoteCandidateType,
        remoteCandidateProtocol,
      }

      this.lastMetrics = metrics
      for (const cb of this.subscribers) {
        cb(metrics)
      }

      // DEV-ONLY: Print advanced diagnostics if flag is set
      if (localStorage.getItem("DEBUG_PERF") === "true") {
        const now = metrics.timestamp
        if (this.lastTimestamp > 0) {
          const deltaMs = now - this.lastTimestamp
          const deltaSent = bytesSent - this.lastBytesSent
          const deltaRecv = bytesReceived - this.lastBytesReceived
          
          if (deltaSent > 0 || deltaRecv > 0) {
            const speedSent = (deltaSent / deltaMs) * 1000 // bytes per second
            const speedRecv = (deltaRecv / deltaMs) * 1000 // bytes per second
            const rttMs = currentRoundTripTime ? (currentRoundTripTime * 1000).toFixed(1) : "???"
            const outLimit = availableOutgoingBitrate ? (availableOutgoingBitrate / 1000 / 1000).toFixed(2) : "???"

            console.log(`[WebRTC Profiler] Peer: ${this.peerId.slice(0,8)}...
  Sent: ${(speedSent / 1024 / 1024).toFixed(2)} MB/s | Recv: ${(speedRecv / 1024 / 1024).toFixed(2)} MB/s
  RTT: ${rttMs} ms | Outgoing Bitrate Limit: ${outLimit} Mbps
  ICE Path: Local ${localCandidateType} (${localCandidateProtocol}) -> Remote ${remoteCandidateType} (${remoteCandidateProtocol})`)
          }
        }
        this.lastTimestamp = now
        this.lastBytesSent = bytesSent
        this.lastBytesReceived = bytesReceived
      }

    } catch (e) {
      // stats collection error ignored
    }
  }

  getLastMetrics() {
    return this.lastMetrics
  }
}
