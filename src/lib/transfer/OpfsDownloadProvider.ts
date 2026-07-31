import type { SaveProvider } from "./SaveProvider"
import type { FileMetadata } from "./types"

/**
 * Origin Private File System (OPFS) Save Provider.
 *
 * Streams received chunks directly to disk (sandboxed in OPFS), avoiding RAM explosion.
 * Crucial for Android/iOS where FileSystemWritableFileStream (native disk) isn't supported,
 * and BrowserDownloadProvider (in-memory Blob) crashes on large files.
 *
 * After completion, we get a `File` object backed by the OPFS file (zero-copy into RAM),
 * and create an ObjectURL from it so the user can download it via an `<a>` tag.
 */
export class OpfsDownloadProvider implements SaveProvider {
  private fileHandle: FileSystemFileHandle | null = null
  private writable: FileSystemWritableFileStream | null = null
  private opfsDir: FileSystemDirectoryHandle | null = null
  private readonly tempFileName: string

  constructor(private readonly meta: FileMetadata) {
    this.tempFileName = `${meta.transferId}_${meta.fileName}`
  }

  async initialize(): Promise<void> {
    this.opfsDir = await navigator.storage.getDirectory()
    // Create a temporary file in OPFS
    this.fileHandle = await this.opfsDir.getFileHandle(this.tempFileName, {
      create: true,
    })
    this.writable = await this.fileHandle.createWritable()
  }

  async write(chunk: ArrayBuffer | Uint8Array, offset: number): Promise<void> {
    if (!this.writable) throw new Error("OPFS not initialized")
    // write() allows an object specifying { type: "write", position: offset, data: chunk }
    // which guarantees chunks go to the correct offset even if out-of-order,
    // though WebRTC DataChannel (ordered: true) guarantees order.
    await this.writable.write({ type: "write", position: offset, data: chunk })
  }

  async close() {
    if (this.writable) {
      await this.writable.close()
      this.writable = null
    }

    if (!this.fileHandle) throw new Error("No file handle")

    // Get a File object representing the OPFS file.
    // This is backed by disk, so it takes almost 0 RAM.
    const file = await this.fileHandle.getFile()

    // It's safe to create an Object URL from a File.
    const downloadUrl = URL.createObjectURL(file)

    // Schedule cleanup of the OPFS file after the browser is closed or the user downloads.
    // In a real app we might want a "Downloads" manager UI to clear OPFS,
    // but for HyperSync we want ephemeral transfers.
    // We cannot delete the file right now, otherwise the downloadUrl breaks immediately.
    // We will clean it up on window unload or next load.

    return { downloadUrl, blob: file }
  }

  async abort() {
    if (this.writable) {
      try {
        await this.writable.close()
      } catch {}
      this.writable = null
    }
    if (this.opfsDir && this.fileHandle) {
      try {
        await this.opfsDir.removeEntry(this.tempFileName)
      } catch {}
    }
  }

  /** Run during app startup to clean up leftover OPFS temp files */
  static async cleanupStaleFiles(): Promise<void> {
    try {
      const opfsDir = await navigator.storage.getDirectory()
      for await (const name of (opfsDir as any).keys()) {
        try {
          await opfsDir.removeEntry(name)
        } catch (e) {
          console.warn(`Failed to clean up stale OPFS file: ${name}`, e)
        }
      }
    } catch (e) {
      // OPFS not supported or error
    }
  }
}
