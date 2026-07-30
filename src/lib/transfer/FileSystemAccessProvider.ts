import type { SaveProvider } from "./SaveProvider"

export class FileSystemAccessProvider implements SaveProvider {
  constructor(private readonly writable: FileSystemWritableFileStream) {}

  write(chunk: ArrayBuffer, _offset: number) {
    return this.writable.write(chunk)
  }

  async close() {
    await this.writable.close()
    return {} // Saved directly to disk, no URL/Blob needed
  }

  async abort() {
    try {
      await this.writable.abort()
    } catch {
      /* ignore */
    }
  }
}
