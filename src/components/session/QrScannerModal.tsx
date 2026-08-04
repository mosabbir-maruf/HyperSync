import { useEffect, useRef, useState } from "react"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import jsQR from "jsqr"

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
    let scanTimeoutId: ReturnType<typeof setTimeout> | null = null
    let active = true

    // Hidden canvas for extracting image data for jsQR
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d", { willReadFrequently: true })

    async function initCamera() {
      try {
        setError(null)
        // Relaxed constraints for iOS compatibility
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        })

        if (!active) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        const video = videoRef.current
        if (!video) return

        video.srcObject = stream
        video.setAttribute("playsinline", "true") // required to tell iOS safari we don't want fullscreen
        video.muted = true
        await video.play()

        // Wait until video has valid dimensions
        const waitForDimensions = async () => {
          if (!active) return false
          if (video.videoWidth > 0 && video.videoHeight > 0) return true
          await new Promise((r) => setTimeout(r, 50))
          return waitForDimensions()
        }

        const ready = await waitForDimensions()
        if (!ready) return

        // Set up canvas dimensions (bounding box to save CPU)
        const scanSize = 400
        const scale = Math.min(
          scanSize / video.videoWidth,
          scanSize / video.videoHeight,
          1,
        )
        canvas.width = video.videoWidth * scale
        canvas.height = video.videoHeight * scale

        // Check if native BarcodeDetector is available
        const detector =
          "BarcodeDetector" in window
            ? new (window as any).BarcodeDetector({ formats: ["qr_code"] })
            : null

        const scanFrame = async () => {
          if (!active || !video) return

          try {
            if (video.readyState >= 2) {
              let rawResult: string | null = null

              // 1. Try Native Detector (Fastest)
              if (detector) {
                const barcodes = await detector.detect(video).catch(() => [])
                if (barcodes.length > 0 && barcodes[0].rawValue) {
                  rawResult = barcodes[0].rawValue
                }
              }

              // 2. Fallback to jsQR if native fails or is unavailable
              if (!rawResult && ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                const imageData = ctx.getImageData(
                  0,
                  0,
                  canvas.width,
                  canvas.height,
                )
                const qr = jsQR(
                  imageData.data,
                  imageData.width,
                  imageData.height,
                  {
                    inversionAttempts: "dontInvert", // save CPU, we usually scan normal QRs
                  },
                )
                if (qr && qr.data) {
                  rawResult = qr.data
                }
              }

              // Process Result
              if (rawResult) {
                const result = extractCode(rawResult.trim())
                if (result) {
                  active = false
                  onScan(result.code, result.isGroup)
                  onClose()
                  return // Stop loop
                }
              }
            }
          } catch (e) {
            // Ignore frame detection errors (single frame failures are normal)
            console.debug("[QRScanner] Frame error:", e)
          }

          // Single-flight scan loop (~10 FPS)
          if (active) {
            scanTimeoutId = setTimeout(scanFrame, 100)
          }
        }

        // Start scanning loop
        scanFrame()
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Unable to access camera",
          )
        }
      }
    }

    void initCamera()

    return () => {
      active = false
      if (scanTimeoutId) clearTimeout(scanTimeoutId)
      if (stream) stream.getTracks().forEach((t) => t.stop())
      if (videoRef.current) videoRef.current.srcObject = null
      // Canvas is GC'd automatically
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
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
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

function extractCode(raw: string): { code: string; isGroup: boolean } | null {
  try {
    const url = new URL(raw)
    const code = url.searchParams.get("code")
    if (code) {
      const upperCode = code.toUpperCase()
      return {
        code: upperCode,
        isGroup: upperCode.startsWith("G") || url.pathname.includes("/group"),
      }
    }
  } catch {
    const clean = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
    if (clean.length === 6) {
      return { code: clean, isGroup: clean.startsWith("G") }
    }
  }
  return null
}
