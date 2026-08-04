export class WebRtcProfiler {
  private timer: ReturnType<typeof setInterval> | null = null
  private lastBytesSent = 0
  private lastBytesReceived = 0
  private lastTimestamp = 0

  constructor(
    private readonly pc: RTCPeerConnection,
    private readonly peerId: string,
  ) {}

  public start() {
    if (localStorage.getItem("DEBUG_PERF") !== "true") return
    if (this.timer) return

    this.timer = setInterval(async () => {
      try {
        const stats = await this.pc.getStats()
        this.processStats(stats)
      } catch (e) {
        console.warn("[WebRtcProfiler] Failed to getStats:", e)
      }
    }, 2000)
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private processStats(stats: RTCStatsReport) {
    let transportBytesSent = 0
    let transportBytesReceived = 0
    let availableOutgoingBitrate = 0
    let selectedCandidatePairId = ""
    let currentRtt = 0
    let localCandidateId = ""
    let remoteCandidateId = ""

    stats.forEach((report) => {
      if (report.type === "transport") {
        transportBytesSent = report.bytesSent || 0
        transportBytesReceived = report.bytesReceived || 0
        selectedCandidatePairId = report.selectedCandidatePairId || ""
      }
      if (report.type === "candidate-pair" && report.id === selectedCandidatePairId) {
        currentRtt = report.currentRoundTripTime || 0
        availableOutgoingBitrate = report.availableOutgoingBitrate || 0
        localCandidateId = report.localCandidateId || ""
        remoteCandidateId = report.remoteCandidateId || ""
      }
    })

    let localType = ""
    let localProtocol = ""
    let remoteType = ""
    let remoteProtocol = ""

    if (localCandidateId) {
      const local = stats.get(localCandidateId)
      if (local) {
        localType = local.candidateType || ""
        localProtocol = local.protocol || ""
      }
    }
    if (remoteCandidateId) {
      const remote = stats.get(remoteCandidateId)
      if (remote) {
        remoteType = remote.candidateType || ""
        remoteProtocol = remote.protocol || ""
      }
    }

    const now = performance.now()
    if (this.lastTimestamp > 0) {
      const deltaMs = now - this.lastTimestamp
      const deltaSent = transportBytesSent - this.lastBytesSent
      const deltaRecv = transportBytesReceived - this.lastBytesReceived
      const speedSent = (deltaSent / deltaMs) * 1000 // bytes per second
      const speedRecv = (deltaRecv / deltaMs) * 1000 // bytes per second

      console.log(`[WebRtcProfiler] Peer: ${this.peerId}
  Sent: ${(speedSent / 1024 / 1024).toFixed(2)} MB/s | Recv: ${(speedRecv / 1024 / 1024).toFixed(2)} MB/s
  RTT: ${(currentRtt * 1000).toFixed(1)} ms
  Outgoing Bitrate limit: ${(availableOutgoingBitrate / 1000 / 1000).toFixed(2)} Mbps
  Local: ${localType} (${localProtocol}) -> Remote: ${remoteType} (${remoteProtocol})`)
    }

    this.lastTimestamp = now
    this.lastBytesSent = transportBytesSent
    this.lastBytesReceived = transportBytesReceived
  }
}
