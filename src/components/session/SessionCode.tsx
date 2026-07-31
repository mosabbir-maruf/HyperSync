import { useState } from "react"
import { CheckIcon, CopyIcon } from "../ui/icons"
import { clipboardService } from "../../browser/ClipboardService"

/** Large, monospaced pairing code with copy-to-clipboard. */
export function SessionCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await clipboardService.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard blocked; code is visible anyway */
    }
  }

  return (
    <div>
      <span className="label-mono">Pairing code</span>
      <button
        onClick={copy}
        className="group mt-2 flex w-full items-center gap-3 rounded-2xl border border-border-strong bg-card px-4 py-3 transition-colors hover:bg-secondary"
        aria-label="Copy pairing code"
      >
        <span className="font-mono text-[28px] font-medium tracking-[0.22em]">
          {code}
        </span>
        <span className="ml-auto text-muted-foreground transition-colors group-hover:text-foreground">
          {copied ? (
            <CheckIcon width={18} height={18} />
          ) : (
            <CopyIcon width={18} height={18} />
          )}
        </span>
      </button>
    </div>
  )
}
