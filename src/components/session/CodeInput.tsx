import { useEffect, useRef, useState } from "react"
import { normalizeCode } from "../../lib/utils"

/** Six-character segmented pairing code entry. Emits the normalized value. */
export function CodeInput({
  onComplete,
  autoFocus,
}: {
  onComplete: (code: string) => void
  autoFocus?: boolean
}) {
  const [raw, setRaw] = useState("")
  const lastCompleted = useRef<string | null>(null)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])

  const chars = raw
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6)
    .padEnd(6, " ")
    .split("")

  const handle = (value: string) => {
    const clean = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6)
    setRaw(clean)
    if (clean.length === 6 && lastCompleted.current !== clean) {
      lastCompleted.current = clean
      onComplete(normalizeCode(clean))
    } else if (clean.length < 6) {
      lastCompleted.current = null
    }
  }

  return (
    <div className="relative">
      <input
        ref={ref}
        id="pairing-code-input"
        value={raw}
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="one-time-code"
        aria-label="Pairing code"
        onChange={(e) => handle(e.target.value)}
        className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
      />
      <div className="flex justify-between gap-2">
        {chars.map((c, i) => (
          <div
            key={i}
            className={
              "flex h-14 flex-1 items-center justify-center rounded-xl border font-mono text-2xl font-medium " +
              (i === Math.min(raw.length, 5) && raw.length < 6
                ? "border-primary bg-accent"
                : "border-border-strong bg-card")
            }
          >
            {c.trim()}
          </div>
        ))}
      </div>
    </div>
  )
}
