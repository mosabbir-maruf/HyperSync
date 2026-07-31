import { useEffect, useState } from "react"
import {
  PipelineProfiler,
  type PipelineMetrics,
} from "../../lib/transfer/PipelineProfiler"
import { useSession } from "../../state/SessionProvider"

export function PerformanceOverlay() {
  const { session } = useSession()
  const [pipelineStats, setPipelineStats] =
    useState<ReturnType<typeof PipelineProfiler.prototype.getAveragesAndReset> | null>(
      null,
    )
  const [rtcStats, setRtcStats] = useState<any>(null)

  useEffect(() => {
    // Poll profiler averages every 1s
    const timer = setInterval(
      () => {
        setPipelineStats(PipelineProfiler.get().getAveragesAndReset())

        // We can grab the latest WebRTC stats if the session has a peer connection
        if (session?.peerConnection?.stats) {
          setRtcStats(session.peerConnection.stats.getLastMetrics())
        }
      },
      1000,
    )

    return () => clearInterval(timer)
  }, [session])

  if (!pipelineStats && !rtcStats) return null

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-green-400 font-mono text-xs p-4 rounded z-50 backdrop-blur pointer-events-none w-72">
      <h3 className="font-bold text-white mb-2 uppercase tracking-wider">
        Metrics Profiler
      </h3>

      <div className="space-y-1 mb-3">
        <div className="text-gray-400 mb-1 border-b border-gray-700 pb-1">
          DataChannel (SCTP)
        </div>
        <div className="flex justify-between">
          <span>Bitrate (Out):</span>
          <span>
            {rtcStats?.availableOutgoingBitrate
              ? (rtcStats.availableOutgoingBitrate / 1_000_000).toFixed(1) +
                " Mbps"
              : "N/A"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Bitrate (In):</span>
          <span>
            {rtcStats?.availableIncomingBitrate
              ? (rtcStats.availableIncomingBitrate / 1_000_000).toFixed(1) +
                " Mbps"
              : "N/A"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>RTT:</span>
          <span>
            {rtcStats?.currentRoundTripTime
              ? (rtcStats.currentRoundTripTime * 1000).toFixed(1) + " ms"
              : "N/A"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Packet Loss:</span>
          <span>{rtcStats?.packetsLost ?? 0} pkts</span>
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-gray-400 mb-1 border-b border-gray-700 pb-1">
          Pipeline Latency (Avg)
        </div>
        <div className="flex justify-between">
          <span>Disk Read:</span>
          <span
            className={
              pipelineStats?.readMs && pipelineStats.readMs > 20
                ? "text-red-400"
                : ""
            }
          >
            {pipelineStats?.readMs.toFixed(1)}ms (
            {pipelineStats?.readMBps.toFixed(1)} MB/s)
          </span>
        </div>
        <div className="flex justify-between">
          <span>Zero-Copy Encode:</span>
          <span>{pipelineStats?.encodeMs.toFixed(2)}ms</span>
        </div>
        <div className="flex justify-between">
          <span>Zero-Copy Decode:</span>
          <span>{pipelineStats?.decodeMs.toFixed(2)}ms</span>
        </div>
        <div className="flex justify-between">
          <span>Disk Write (OPFS):</span>
          <span
            className={
              pipelineStats?.writeMs && pipelineStats.writeMs > 20
                ? "text-red-400"
                : ""
            }
          >
            {pipelineStats?.writeMs.toFixed(1)}ms (
            {pipelineStats?.writeMBps.toFixed(1)} MB/s)
          </span>
        </div>
      </div>
    </div>
  )
}
