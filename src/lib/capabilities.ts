/**
 * Browser & platform capability detection.
 * Pure module (no React) so it can be used by the transfer engine and UI alike.
 */

export type BrowserName = "chrome" | "edge" | "firefox" | "safari" | "brave" | "arc" | "samsung" | "unknown"

/**
 * The single source of truth for what the current environment can do. Nothing
 * elsewhere should sniff `navigator` directly — components and services read
 * these flags so browser quirks stay quarantined behind one boundary
 * (BrowserAdapter → Capability layer → UI).
 */
export interface Capabilities {
  // Core transport / files
  webrtc: boolean
  dataChannel: boolean
  fileApi: boolean
  blobApi: boolean
  streamsApi: boolean
  indexedDb: boolean
  /** Stream received bytes straight to disk (avoids full in-memory buffering). */
  fileSystemAccess: boolean
  directoryPicker: boolean
  filePicker: boolean
  writableStreams: boolean
  secureCrypto: boolean

  // Peripheral APIs
  clipboard: boolean
  shareApi: boolean
  /** A camera exists that could back a QR scanner. */
  qrCamera: boolean
  /** Permission state is resolved asynchronously; "unknown" means the browser will ask on use. */
  cameraPermission: PermissionState | "unsupported" | "unknown"

  // Form factor / platform
  touch: boolean
  isMobile: boolean
  isDesktop: boolean
  isIOS: boolean
  isAndroid: boolean
  platform: "iOS" | "Android" | "macOS" | "Windows" | "ChromeOS" | "Linux" | "Web"

  // Browser identity
  browser: BrowserName
  isSafari: boolean
  isChrome: boolean
  isFirefox: boolean
  isEdge: boolean

  /** iOS Safari cannot use showSaveFilePicker; large receives fall back to Blob. */
  streamingDownload: boolean
}

function ua(): string {
  return typeof navigator !== "undefined" ? navigator.userAgent : ""
}

function detectBrowser(s: string): BrowserName {
  const nav =
    typeof navigator !== "undefined"
      ? navigator as Navigator & { brave?: unknown }
      : undefined
  if (nav?.brave) return "brave"
  if (/Edg\//.test(s)) return "edge"
  if (/SamsungBrowser/.test(s)) return "samsung"
  if (/Firefox\//.test(s)) return "firefox"
  // Arc ships a Chromium UA; it exposes a marker CSS variable rather than a UA token.
  if (typeof window !== "undefined") {
    try {
      const arc = getComputedStyle(document.documentElement).getPropertyValue(
        "--arc-palette-title",
      )
      if (arc) return "arc"
    } catch {
      /* getComputedStyle may throw pre-mount; ignore */
    }
  }
  if (/Chrome\//.test(s) && !/Chromium/.test(s)) return "chrome"
  if (/Safari\//.test(s) && !/Chrome\//.test(s)) return "safari"
  return "unknown"
}

export function detectCapabilities(): Capabilities {
  const hasWindow = typeof window !== "undefined"
  const nav = typeof navigator !== "undefined" ? navigator : undefined

  const webrtc = hasWindow && typeof window.RTCPeerConnection === "function"
  const dataChannel =
    webrtc &&
    typeof window.RTCPeerConnection.prototype.createDataChannel === "function"
  const fileApi = typeof File !== "undefined"
  const blobApi = typeof Blob !== "undefined"
  const streamsApi =
    typeof ReadableStream !== "undefined" &&
    typeof WritableStream !== "undefined"
  const indexedDb = hasWindow && "indexedDB" in window
  const fileSystemAccess = hasWindow && "showSaveFilePicker" in window
  const directoryPicker = hasWindow && "showDirectoryPicker" in window
  const filePicker = hasWindow && "showOpenFilePicker" in window
  const writableStreams = streamsApi && fileSystemAccess
  const secureCrypto =
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  const clipboard = !!nav && "clipboard" in nav
  const shareApi = !!nav && typeof nav.share === "function"
  const qrCamera =
    !!nav?.mediaDevices && typeof nav.mediaDevices.getUserMedia === "function"

  const s = ua()
  const touch =
    (!!nav && nav.maxTouchPoints > 0) || (hasWindow && "ontouchstart" in window)
  const isIOS =
    /iPad|iPhone|iPod/.test(s) ||
    // iPadOS reports as Mac; disambiguate by touch.
    (/Macintosh/.test(s) && !!nav && nav.maxTouchPoints > 1)
  const isAndroid = /Android/.test(s)
  const isMobile = isIOS || isAndroid || /Mobi/.test(s)
  const platform = isIOS
    ? "iOS"
    : isAndroid
      ? "Android"
      : /Mac OS X|Macintosh/i.test(s)
        ? "macOS"
        : /Windows/i.test(s)
          ? "Windows"
          : /CrOS/i.test(s)
            ? "ChromeOS"
            : /Linux/i.test(s)
              ? "Linux"
              : "Web"

  const browser = detectBrowser(s)

  return {
    webrtc,
    dataChannel,
    fileApi,
    blobApi,
    streamsApi,
    indexedDb,
    fileSystemAccess,
    directoryPicker,
    filePicker,
    writableStreams,
    secureCrypto,
    clipboard,
    shareApi,
    qrCamera,
    cameraPermission: qrCamera ? "unknown" : "unsupported",
    touch,
    isMobile,
    isDesktop: !isMobile,
    isIOS,
    isAndroid,
    platform,
    browser,
    isSafari: browser === "safari",
    isChrome: browser === "chrome",
    isFirefox: browser === "firefox",
    isEdge: browser === "edge",
    streamingDownload: fileSystemAccess && !isIOS,
  }
}

/** Resolve camera permission without prompting; camera acquisition remains user initiated. */
export async function detectCameraPermission(): Promise<Capabilities["cameraPermission"]> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia)
    return "unsupported"
  if (!navigator.permissions?.query) return "unknown"
  try {
    return (
      await navigator.permissions.query({ name: "camera" as PermissionName })
    ).state
  } catch {
    return "unknown"
  }
}

let cached: Capabilities | null = null
export function getCapabilities(): Capabilities {
  if (!cached) cached = detectCapabilities()
  return cached
}

/** True when the environment can run the core transfer flow at all. */
export function isSupported(caps = getCapabilities()): boolean {
  return caps.webrtc && caps.dataChannel && caps.fileApi && caps.secureCrypto
}
