import { QRCodeSVG } from "qrcode.react"
import { useTheme } from "../../state/ThemeProvider"
import { qrCodeService } from "../../services/QrCodeService"

/** Renders a scannable QR encoding the join URL. Theme-aware colors. */
export function QRDisplay({
  value,
  size = 208,
}: {
  value: string
  size?: number
}) {
  const { resolved } = useTheme()
  const payload = qrCodeService.create(value, { dark: resolved === "dark" })
  return (
    <div className="inline-flex rounded-2xl border border-border-strong bg-card p-4">
      <QRCodeSVG
        value={payload.value}
        size={size}
        fgColor={payload.foreground}
        bgColor={payload.background}
        level="M"
        marginSize={0}
      />
    </div>
  )
}
