import { useEffect, useRef, useState } from "react"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"

interface QrScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onScan: (code: string, isGroup: boolean) => void
}

export function QrScannerModal({
  isOpen,
  onClose,
  onScan,
}: QrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    let stream: MediaStream | null = null
    let animFrameId: number | null = null
    let active = true

    async function initCamera() {
      try {
        setError(null)
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })

        if (!active) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        // Use native browser BarcodeDetector API if supported (Chrome, Edge, Android Chrome, Safari 17+)
        if ("BarcodeDetector" in window) {
          const detector = new (window as any).BarcodeDetector({
            formats: ["qr_code"],
          })
          const scanFrame = async () => {
            if (!active || !videoRef.current) return
            try {
              if (videoRef.current.readyState >= 2) {
                const barcodes = await detector.detect(videoRef.current)
                if (barcodes.length > 0 && barcodes[0].rawValue) {
                  const raw = barcodes[0].rawValue.trim()
                  const result = extractCode(raw)
                  if (result) {
                    active = false
                    onScan(result.code, result.isGroup)
                    onClose()
                    return
                  }
                }
              }
            } catch {
              // Ignore frame detection errors
            }
            if (active) {
              animFrameId = requestAnimationFrame(scanFrame)
            }
          }
          scanFrame()
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to access camera")
      }
    }

    void initCamera()

    return () => {
      active = false
      if (animFrameId) cancelAnimationFrame(animFrameId)
      if (stream) stream.getTracks().forEach((t) => t.stop())
    }
  }, [isOpen, onScan, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <Card className="relative w-full max-w-sm overflow-hidden p-0 border-border shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-base font-semibold">Scan QR Code</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="relative aspect-square w-full bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full object-cover"
          />

          {/* Target Reticle Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative h-48 w-48 rounded-xl border-2 border-primary bg-primary/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-primary animate-pulse" />
            </div>
          </div>

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-background/95">
              <p className="text-sm font-medium text-destructive mb-2">
                {error}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Please allow camera permissions in your browser.
              </p>
              <Button size="sm" variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          )}
        </div>

        <div className="p-4 text-center text-xs text-muted-foreground">
          Point camera at the QR code to connect automatically.
        </div>
      </Card>
    </div>
  )
}

function extractCode(raw: string): { code: string isGroup: boolean } | null {
  try {
    const url = new URL(raw)
    const code = url.searchParams.get("code")
    if (code) {
      return {
        code: code.toUpperCase(),
        isGroup: url.pathname.includes("/group"),
      }
    }
  } catch {
    const clean = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
    if (clean.length === 6) return { code: clean, isGroup: false }
  }
  return null
}
