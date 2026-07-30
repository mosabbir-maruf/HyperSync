export interface BrowserAdapter {
  readonly window: Window | undefined
  readonly navigator: Navigator | undefined
  readonly document: Document | undefined
}

export class NativeBrowserAdapter implements BrowserAdapter {
  get window(): Window | undefined {
    return typeof globalThis.window === "undefined"
      ? undefined
      : globalThis.window
  }

  get navigator(): Navigator | undefined {
    return typeof globalThis.navigator === "undefined"
      ? undefined
      : globalThis.navigator
  }

  get document(): Document | undefined {
    return typeof globalThis.document === "undefined"
      ? undefined
      : globalThis.document
  }
}

export const browserAdapter: BrowserAdapter = new NativeBrowserAdapter()
