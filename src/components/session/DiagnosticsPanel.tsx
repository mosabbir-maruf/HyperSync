import { useEffect, useState } from "react"
import { type PeerConnection } from "../../lib/webrtc/PeerConnection"
import { type WebRTCMetrics } from "../../lib/webrtc/WebRTCStats"
import { Card } from "../ui/Card"
import { ActivityIcon, NetworkIcon, ChevronDownIcon, ChevronUpIcon } from "../ui/icons"
import { Avatar } from "./Avatar"
import { avatarColor } from "../../lib/utils"

interface DiagnosticsPanelProps {
  peers: PeerConnection[]
  names?: Record<string, string>
}

function formatBitrate(bps?: number): string {
  if (bps === undefined) return "N/A"
  return (bps / 1_000_000).toFixed(2) + " Mbps"
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec === 0) return "0 B/s"
  const mbps = bytesPerSec / 1024 / 1024
  if (mbps > 1) return mbps.toFixed(2) + " MB/s"
  const kbps = bytesPerSec / 1024
  return kbps.toFixed(1) + " KB/s"
}

function PeerDiagnostics({ pc, name }: { pc: PeerConnection, name?: string }) {
  const [metrics, setMetrics] = useState<WebRTCMetrics | null>(pc.stats.getLastMetrics())
  const [speed, setSpeed] = useState({ up: 0, down: 0 })

  useEffect(() => {
    let lastBytesSent = pc.stats.getLastMetrics()?.bytesSent || 0
    let lastBytesReceived = pc.stats.getLastMetrics()?.bytesReceived || 0
    let lastTime = performance.now()

    const unsub = pc.stats.subscribe((m) => {
      setMetrics(m)
      const now = performance.now()
      const deltaMs = now - lastTime

      if (deltaMs > 0) {
        const deltaSent = m.bytesSent - lastBytesSent
        const deltaRecv = m.bytesReceived - lastBytesReceived
        setSpeed({
          up: (deltaSent / deltaMs) * 1000,
          down: (deltaRecv / deltaMs) * 1000,
        })
      }

      lastBytesSent = m.bytesSent
      lastBytesReceived = m.bytesReceived
      lastTime = now
    })
    return unsub
  }, [pc])

  if (!metrics) {
    return (
      <div className="py-2 text-[11px] text-muted-foreground flex items-center justify-center">
        Waiting for stats...
      </div>
    )
  }

  const rtt = metrics.currentRoundTripTime
    ? (metrics.currentRoundTripTime * 1000).toFixed(0) + "ms"
    : "..."

  const displayName = name || pc.peerId.slice(0, 6)

  return (
    <div className="flex flex-col gap-1.5 border-b border-border/50 pb-3 last:border-0 last:pb-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
            {pc.connectionState.toUpperCase()}
          </span>
          <div className="flex items-center gap-1.5">
            <Avatar name={displayName} color={avatarColor(pc.peerId)} size={16} className="shadow-sm" />
            <span className="text-[12px] font-medium text-foreground truncate max-w-[100px]">
              {displayName}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
          <ActivityIcon width={10} height={10} />
          {rtt}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <p className="text-muted-foreground/70 mb-0.5">Up</p>
          <p className="font-mono">{formatSpeed(speed.up)}</p>
        </div>
        <div>
          <p className="text-muted-foreground/70 mb-0.5">Down</p>
          <p className="font-mono">{formatSpeed(speed.down)}</p>
        </div>
        <div>
          <p className="text-muted-foreground/70 mb-0.5">Pkt Loss</p>
          <p className="font-mono">{metrics.packetsLost}</p>
        </div>
        <div>
          <p className="text-muted-foreground/70 mb-0.5">Limit (Out)</p>
          <p className="font-mono">{formatBitrate(metrics.availableOutgoingBitrate)}</p>
        </div>
      </div>
      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
        <NetworkIcon width={10} height={10} className="shrink-0" />
        <span className="truncate">
          {metrics.localCandidateType} ⟷ {metrics.remoteCandidateType} ({metrics.localCandidateProtocol})
        </span>
      </div>
    </div>
  )
}

export function DiagnosticsPanel({ peers, names = {} }: DiagnosticsPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false)

  if (!peers || peers.length === 0) return null

  return (
    <Card className={`fixed bottom-6 right-6 z-50 w-64 overflow-x-hidden border border-border/50 bg-background/80 shadow-2xl backdrop-blur-xl transition-all duration-300 ${isMinimized ? 'h-12' : 'max-h-[400px] p-3 overflow-y-auto'}`}>
      <div className={`flex items-center justify-between border-border/50 ${isMinimized ? 'px-3 h-full' : 'mb-3 border-b pb-2'}`}>
        <h3 className="label-mono flex items-center gap-1.5 cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
          </span>
          Diagnostics
        </h3>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-muted-foreground">
            {peers.length} Peer{peers.length > 1 ? "s" : ""}
          </span>
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {isMinimized ? <ChevronUpIcon width={14} height={14} /> : <ChevronDownIcon width={14} height={14} />}
          </button>
        </div>
      </div>
      {!isMinimized && (
        <div className="flex flex-col gap-3">
          {peers.map((pc, i) => (
            <PeerDiagnostics key={i} pc={pc} name={names[pc.peerId]} />
          ))}
        </div>
      )}
    </Card>
  )
}
