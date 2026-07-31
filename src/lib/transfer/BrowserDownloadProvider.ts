import type { SaveProvider } from "./SaveProvider"
import type { FileMetadata } from "./types"

export class BrowserDownloadProvider implements SaveProvider {
  private parts: ArrayBuffer[] = []

  constructor(private readonly meta: FileMetadata) {}

  write(chunk: ArrayBuffer | Uint8Array, _offset: number): void {
    this.parts.push(chunk)
  }

  async close() {
    const blob = new Blob(this.parts, {
      type: this.meta.mimeType || "application/octet-stream",
    })
    
    // Force aggressive cleanup of chunk references
    this.parts = []
    
    const downloadUrl = URL.createObjectURL(blob)
    return { downloadUrl, blob }
  }

  abort() {
    this.parts = []
  }
}
