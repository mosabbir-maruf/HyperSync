import { browserAdapter } from "./BrowserAdapter"

export interface QrScanner {
  start(): Promise<void>
  stop(): void
  onResult(listener: (value: string) => void): () => void
  onError(listener: (error: Error) => void): () => void
}

/** Camera plumbing boundary; a decoder can be added without changing pairing UI. */
export class CameraQrScanner implements QrScanner {
  private stream: MediaStream | null = null
  private readonly results = new Set<(value: string) => void>()
  private readonly errors = new Set<(error: Error) => void>()

  async start(): Promise<void> {
    try {
      const mediaDevices = browserAdapter.navigator?.mediaDevices
      if (!mediaDevices) throw new Error("Camera is unavailable")
      this.stream = await mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
    } catch (cause) {
      const error =
        cause instanceof Error ? cause : new Error("Unable to start camera")
      this.errors.forEach((listener) => listener(error))
      throw error
    }
  }

  stop(): void {
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
  }

  onResult(listener: (value: string) => void): () => void {
    this.results.add(listener)
    return () => this.results.delete(listener)
  }

  onError(listener: (error: Error) => void): () => void {
    this.errors.add(listener)
    return () => this.errors.delete(listener)
  }
}
