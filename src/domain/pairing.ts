export type PairingMethod = "manual-code" | "qr-code" | "copy-link" | "paste-code" | "nearby"

export interface PairingSession {
  sessionId: string
  code: string
  joinUrl: string
  role: "host" | "guest"
}
