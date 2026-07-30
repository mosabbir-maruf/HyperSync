export interface QrCodeOptions {
  highContrast?: boolean
  dark?: boolean
}

export interface QrCodePayload {
  value: string
  foreground: string
  background: string
}

export interface QrCodeService {
  create(value: string, options?: QrCodeOptions): QrCodePayload
}

/** Keeps QR appearance policy out of rendering components. */
export class DefaultQrCodeService implements QrCodeService {
  create(value: string, options: QrCodeOptions = {}): QrCodePayload {
    const dark = options.dark ?? false
    return {
      value,
      foreground: dark ? "#e9eaec" : "#16181d",
      background: dark ? "#131519" : "#ffffff",
    }
  }
}

export const qrCodeService: QrCodeService = new DefaultQrCodeService()
