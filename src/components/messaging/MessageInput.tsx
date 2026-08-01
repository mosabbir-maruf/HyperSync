import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react"
import { EmojiPicker } from "./EmojiPicker"
import { cn } from "../../lib/utils"
import { MAX_MESSAGE_LENGTH } from "../../lib/messaging/types"

// ─────────────────────────────────────────────────────────────────────────────
// Send icon (inline)
// ─────────────────────────────────────────────────────────────────────────────

function SendIcon({ disabled }: { disabled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "transition-colors",
        disabled ? "text-muted-foreground" : "text-primary",
      )}
      aria-hidden
    >
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  )
}

function SmileIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 13s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  )
}

function PaperclipIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MessageInput
// ─────────────────────────────────────────────────────────────────────────────

interface MessageInputProps {
  recentEmoji: string[]
  onSend: (text: string) => void
  onTypingStart: () => void
  onTypingStop: () => void
  onEmojiSelect: (emoji: string) => void
  onAttach?: () => void
  disabled?: boolean
  autoFocus?: boolean
}

export function MessageInput({
  recentEmoji,
  onSend,
  onTypingStart,
  onTypingStop,
  onEmojiSelect,
  onAttach,
  disabled = false,
  autoFocus = false,
}: MessageInputProps) {
  const [text, setText] = useState("")
  const [showEmoji, setShowEmoji] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const emojiButtonRef = useRef<HTMLButtonElement>(null)
  const isTypingRef = useRef(false)
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const charCount = text.length
  const overLimit = charCount > MAX_MESSAGE_LENGTH
  const canSend = !disabled && charCount > 0 && !overLimit

  // Auto-focus when enabled
  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus()
  }, [autoFocus])

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      setText(val)
      resizeTextarea()

      if (val.length > 0) {
        if (!isTypingRef.current) {
          isTypingRef.current = true
          onTypingStart()
        }
        // Reset auto-stop timer
        if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current)
        typingStopTimerRef.current = setTimeout(() => {
          isTypingRef.current = false
          onTypingStop()
        }, 2_000)
      } else {
        if (isTypingRef.current) {
          isTypingRef.current = false
          onTypingStop()
        }
      }
    },
    [onTypingStart, onTypingStop, resizeTextarea],
  )

  const handleSend = useCallback(() => {
    const trimmed = text.trimEnd()
    if (!trimmed || overLimit || disabled) return
    onSend(trimmed)
    setText("")
    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    // Stop typing indicator
    if (isTypingRef.current) {
      isTypingRef.current = false
      onTypingStop()
    }
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current)
  }, [text, overLimit, disabled, onSend, onTypingStop])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      const ta = textareaRef.current
      if (ta) {
        const start = ta.selectionStart ?? text.length
        const end = ta.selectionEnd ?? text.length
        const newText = text.slice(0, start) + emoji + text.slice(end)
        setText(newText)
        // Restore cursor position after state update
        requestAnimationFrame(() => {
          ta.selectionStart = start + emoji.length
          ta.selectionEnd = start + emoji.length
          ta.focus()
        })
      } else {
        setText((prev) => prev + emoji)
      }
      onEmojiSelect(emoji)
      setShowEmoji(false)
    },
    [text, onEmojiSelect],
  )

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current)
    }
  }, [])

  return (
    <div className="relative border-t border-border pt-3">
      {showEmoji && (
        <EmojiPicker
          recentEmoji={recentEmoji}
          onSelect={handleEmojiSelect}
          onClose={() => setShowEmoji(false)}
          anchorRef={emojiButtonRef}
        />
      )}

      <div
        className={cn(
          "flex items-end gap-2 rounded-2xl border bg-card px-3 py-2.5 transition-colors",
          overLimit ? "border-destructive" : "border-border-strong",
          "focus-within:border-ring",
        )}
      >
        {/* Emoji toggle */}
        <button
          ref={emojiButtonRef}
          type="button"
          onClick={() => setShowEmoji((v) => !v)}
          aria-label={showEmoji ? "Close emoji picker" : "Open emoji picker"}
          aria-expanded={showEmoji}
          aria-haspopup="dialog"
          disabled={disabled}
          className={cn(
            "flex-shrink-0 p-0.5 rounded-lg text-muted-foreground",
            "transition-colors hover:text-foreground hover:bg-secondary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:opacity-40 disabled:pointer-events-none",
            showEmoji && "text-foreground bg-secondary",
          )}
        >
          <SmileIcon />
        </button>

        {/* Attach button */}
        {onAttach && (
          <button
            type="button"
            onClick={onAttach}
            disabled={disabled}
            aria-label="Attach files"
            className={cn(
              "flex-shrink-0 p-0.5 rounded-lg text-muted-foreground",
              "transition-colors hover:text-foreground hover:bg-secondary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:opacity-40 disabled:pointer-events-none",
            )}
          >
            <PaperclipIcon />
          </button>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          id="chat-message-input"
          role="textbox"
          aria-multiline="true"
          aria-label="Message input"
          aria-describedby="chat-char-count"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={
            disabled
              ? "Connecting…"
              : "Message or drag & drop files  ·  Enter to send"
          }
          className={cn(
            "flex-1 resize-none bg-transparent text-sm text-foreground",
            "placeholder:text-muted-foreground/60",
            "outline-none min-h-[24px]",
            "disabled:opacity-40 disabled:cursor-not-allowed",
          )}
          style={{ lineHeight: "1.5" }}
        />

        {/* Char counter (only near limit) */}
        {charCount > 380 && (
          <span
            id="chat-char-count"
            className={cn(
              "flex-shrink-0 font-mono text-[10px] transition-colors",
              overLimit ? "text-destructive" : "text-muted-foreground",
            )}
            aria-live="polite"
          >
            {MAX_MESSAGE_LENGTH - charCount}
          </span>
        )}

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            "flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full",
            "transition-all hover:bg-secondary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:opacity-40 disabled:pointer-events-none",
            canSend && "hover:bg-primary/10",
          )}
        >
          <SendIcon disabled={!canSend} />
        </button>
      </div>

      {/* Footer hint & Security */}
      <div className="mt-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-success">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            E2E Encrypted
          </span>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground">
          Shift + Enter for new line
        </p>
      </div>
    </div>
  )
}
