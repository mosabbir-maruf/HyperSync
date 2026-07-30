import type { BrowserAdapter } from "./BrowserAdapter"
import { browserAdapter } from "./BrowserAdapter"

export interface ClipboardService {
  writeText(value: string): Promise<void>
}

export class NativeClipboardService implements ClipboardService {
  constructor(private readonly browser: BrowserAdapter = browserAdapter) {}

  async writeText(value: string): Promise<void> {
    const clipboard = this.browser.navigator?.clipboard
    if (!clipboard) throw new Error("Clipboard is unavailable")
    await clipboard.writeText(value)
  }
}

export const clipboardService: ClipboardService = new NativeClipboardService()
