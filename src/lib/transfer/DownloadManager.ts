import { browserCapabilityService } from "./BrowserCapabilityService"
import { BrowserDownloadProvider } from "./BrowserDownloadProvider"
import { FileSystemAccessProvider } from "./FileSystemAccessProvider"
import { OpfsDownloadProvider } from "./OpfsDownloadProvider"
import type { SaveProvider } from "./SaveProvider"
import type { FileMetadata } from "./types"
import { sanitizeFilename } from "../utils"

// Files above this size should prefer streaming to disk to avoid memory pressure
const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024 // 50 MB

export class DownloadManager {
  static async createSaveProvider(meta: FileMetadata): Promise<SaveProvider> {
    const caps = browserCapabilityService.getCapabilities()

    if (caps.hasFileSystemAccess) {
      try {
        const picker = (window as any).showSaveFilePicker
        if (picker) {
          const handle = await picker.call(window, {
            suggestedName: sanitizeFilename(meta.fileName),
          })
          const writable = await handle.createWritable()
          return new FileSystemAccessProvider(writable)
        }
      } catch {
        // User cancelled or browser restricted (non-user-gesture context)
        // Fall through to in-memory provider
      }
    }

    // Fallback 1: Origin Private File System (OPFS)
    // Streams to sandboxed disk instead of RAM. Solves Android OOM crashes.
    if (caps.hasOPFS) {
      try {
        const opfs = new OpfsDownloadProvider(meta)
        await opfs.initialize()
        return opfs
      } catch (e) {
        console.warn("OPFS initialization failed, falling back to RAM", e)
      }
    }

    // Fallback 2: In-memory Blob (legacy)
    // Works for small files, but struggles with memory pressure on large files on mobile.
    return new BrowserDownloadProvider(meta)
  }
}
