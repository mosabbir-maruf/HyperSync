export interface BrowserCapabilities {
  hasReadableStream: boolean
  hasWritableStream: boolean
  hasWebCrypto: boolean
  maxDataChannelMessageSize: number
  hasBlobSupport: boolean
  hasFileSystemAccess: boolean
  hasWebRTC: boolean
  hasClipboard: boolean
  hasCamera: boolean
  hasTouch: boolean
  isSafari: boolean
  isIOS: boolean
  hasOPFS: boolean
}

class BrowserCapabilityService {
  private cache: BrowserCapabilities | null = null

  getCapabilities(): BrowserCapabilities {
    if (this.cache) return this.cache

    const hasReadableStream = typeof ReadableStream !== "undefined"
    const hasWritableStream = typeof WritableStream !== "undefined"
    const hasWebCrypto = typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined"
    const hasBlobSupport = typeof Blob !== "undefined"
    const hasFileSystemAccess = typeof window !== "undefined" && "showSaveFilePicker" in window
    
    const hasWebRTC = typeof RTCPeerConnection !== "undefined"
    const hasClipboard = typeof navigator !== "undefined" && typeof navigator.clipboard !== "undefined"
    const hasCamera = typeof navigator !== "undefined" && typeof navigator.mediaDevices !== "undefined" && typeof navigator.mediaDevices.getUserMedia !== "undefined"
    const hasTouch = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0)
    
    // OPFS is supported in Chrome 109+, Safari 15.2+, Firefox 111+
    const hasOPFS = typeof navigator !== "undefined" && !!navigator.storage && typeof navigator.storage.getDirectory === "function"
    
    // Minimal fallback user-agent detection ONLY for known bugs/restrictions where feature detection is impossible.
    // Safari iOS restricts Blob creation sizes and background operations.
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : ""
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (typeof navigator !== "undefined" && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua)

    this.cache = {
      hasReadableStream,
      hasWritableStream,
      hasWebCrypto,
      hasBlobSupport,
      hasFileSystemAccess,
      hasWebRTC,
      hasClipboard,
      hasCamera,
      hasTouch,
      isSafari,
      isIOS,
      hasOPFS,
      maxDataChannelMessageSize: 256 * 1024,
    }

    return this.cache
  }
}

export const browserCapabilityService = new BrowserCapabilityService()
