import { useEffect, useRef, useState } from "react"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import jsQR from "jsqr"
import { getCapabilities } from "../../lib/capabilities"

interface QrScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onScan: (code: string, isGroup: boolean) => void
}

/**
 * Sample canvas pixel data to verify the frame is not all-black.
 * iOS Safari's hardware video decoder can hand back blank buffers;
 * feeding those to jsQR is wasted work.
 */
function hasVisiblePixels(data: Uint8ClampedArray, samples = 200): boolean {
  const step = Math.max(1, (data.length >>> 2) / samples | 0) * 4
  for (let i = 0; i < data.length; i += step) {
    if (data[i] > 10 || data[i + 1] > 10 || data[i + 2] > 10) return true
  }
  return false
}

export function QrScannerModal({
  isOpen,
  onClose,
  onScan,
}: QrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const scannedRef = useRef(false)

  // Stable callback refs — prevents the main effect from re-running
  // (and tearing down the camera) when the parent re-renders.
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!isOpen) return

    scannedRef.current = false
    let stream: MediaStream | null = null
    let timerId: ReturnType<typeof setTimeout> | null = null
    let active = true

    const { isIOS } = getCapabilities()

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d", { willReadFrequently: true })

    async function initCamera() {
      try {
        setError(null)

        stream = await navigator.mediaDevices.getUserMedia({
          video: isIOS
            ? { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } }
            : { facingMode: "environment" },
        })

        if (!active) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        const video = videoRef.current
        if (!video) return

        video.srcObject = stream
        video.setAttribute("playsinline", "true")
        video.muted = true
        await video.play()

        // Wait for the video to report real dimensions
        while (active && (video.videoWidth === 0 || video.videoHeight === 0)) {
          await new Promise((r) => setTimeout(r, 80))
        }
        if (!active) return

        // Size the canvas once — cap at 640px to save CPU
        const scale = Math.min(640 / video.videoWidth, 640 / video.videoHeight, 1)
        canvas.width = (video.videoWidth * scale) | 0
        canvas.height = (video.videoHeight * scale) | 0

        // BarcodeDetector is fast but broken on iOS Safari (returns empty).
        // Only use it on platforms where it actually works.
        const detector =
          !isIOS && "BarcodeDetector" in window
            ? new (window as any).BarcodeDetector({ formats: ["qr_code"] })
            : null

        // --- Scan loop ------------------------------------------------
        const scan = async () => {
          if (!active) return

          const v = videoRef.current
          if (!v || v.readyState < 2) {
            if (active) timerId = setTimeout(scan, 120)
            return
          }

          try {
            let raw: string | null = null

            // 1. Native BarcodeDetector (non-iOS only, fastest)
            if (detector) {
              try {
                const hits = await detector.detect(v)
                if (hits.length > 0 && hits[0].rawValue) raw = hits[0].rawValue
              } catch { /* single-frame failures are normal */ }
            }

            // 2. jsQR via canvas (primary on iOS, fallback elsewhere)
            if (!raw && ctx) {
              ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height)

              // Skip blank frames (iOS hardware decoder quirk)
              if (!isIOS || hasVisiblePixels(img.data)) {
                const qr = jsQR(img.data, img.width, img.height, {
                  inversionAttempts: "dontInvert",
                })
                if (qr?.data) raw = qr.data
              }
            }

            // 3. Process result
            if (raw) {
              const result = extractCode(raw.trim())
              if (result) {
                active = false
                scannedRef.current = true
                onScanRef.current(result.code, result.isGroup)
                onCloseRef.current()
                return
              }
            }
          } catch (e) {
            console.debug("[QRScanner] Frame error:", e)
          }

          if (active) timerId = setTimeout(scan, 100)
        }

        scan()
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to access camera")
        }
      }
    }

    void initCamera()

    return () => {
      active = false
      if (timerId != null) clearTimeout(timerId)
      if (stream) stream.getTracks().forEach((t) => t.stop())
      if (videoRef.current) videoRef.current.srcObject = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

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
