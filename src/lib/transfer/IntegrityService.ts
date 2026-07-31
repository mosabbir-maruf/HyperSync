import { browserCapabilityService } from "./BrowserCapabilityService"

export class IncrementalHasher {
  private finalHash = new Uint8Array(32) // SHA-256 outputs 32 bytes
  private unsupported = false

  constructor() {
    const caps = browserCapabilityService.getCapabilities()
    if (!caps.hasWebCrypto) {
      this.unsupported = true
    }
  }

  async update(buffer: ArrayBuffer): Promise<void> {
    if (this.unsupported) return

    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer)
    const hashArray = new Uint8Array(hashBuffer)

    // XOR the chunk hash into the final hash
    for (let i = 0; i < 32; i++) {
      this.finalHash[i] ^= hashArray[i]
    }
  }

  digest(): string {
    if (this.unsupported) return "unsupported"

    return Array.from(this.finalHash)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  }
}

export class IntegrityService {
  createHasher(): IncrementalHasher {
    return new IncrementalHasher()
  }

  async hashFile(file: Blob): Promise<string> {
    const hasher = this.createHasher()
    const chunkSize = 4 * 1024 * 1024 // 4MB per read for background hashing
    let offset = 0
    while (offset < file.size) {
      const slice = file.slice(offset, offset + chunkSize)
      const buffer = await slice.arrayBuffer()
      await hasher.update(buffer)
      offset += chunkSize
      // Yield so we don't starve the send loop
      await new Promise<void>((r) => setTimeout(r, 0))
    }
    return hasher.digest()
  }

  async verifyChecksum(file: Blob, expectedChecksum: string): Promise<boolean> {
    if (expectedChecksum === "unsupported") return true

    const hasher = this.createHasher()
    const chunkSize = 2 * 1024 * 1024
    let offset = 0

    while (offset < file.size) {
      const slice = file.slice(offset, offset + chunkSize)
      const buffer = await slice.arrayBuffer()
      await hasher.update(buffer)
      offset += chunkSize
    }

    const actual = hasher.digest()
    return actual === expectedChecksum
  }
}

export const integrityService = new IntegrityService()
