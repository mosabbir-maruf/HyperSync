import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react"
import { cn } from "../../lib/utils"

const PINNED_EMOJI = ["😀", "😂", "❤️", "👍", "🎉", "🔥", "😎", "👋"]

const EMOJI_CATEGORIES: { label: string; items: string[] }[] = [
  {
    label: "Faces",
    items: [
      "😀",
      "😁",
      "😂",
      "🤣",
      "😃",
      "😄",
      "😅",
      "😆",
      "😉",
      "😊",
      "😋",
      "😎",
      "😍",
      "🥰",
      "😘",
      "🤩",
      "😏",
      "😐",
      "😑",
      "😶",
      "🙂",
      "🙃",
      "😌",
      "😔",
      "😪",
      "🤤",
      "😴",
      "😷",
      "🤒",
      "🤕",
      "🥺",
      "😢",
      "😭",
      "😤",
      "😠",
      "😡",
      "🤬",
      "😈",
      "👿",
      "💀",
    ],
  },
  {
    label: "Hands",
    items: [
      "👋",
      "🤚",
      "🖐",
      "✋",
      "🖖",
      "👌",
      "🤌",
      "🤏",
      "✌️",
      "🤞",
      "🤟",
      "🤘",
      "🤙",
      "👈",
      "👉",
      "👆",
      "🖕",
      "👇",
      "☝️",
      "👍",
      "👎",
      "✊",
      "👊",
      "🤛",
      "🤜",
      "👏",
      "🙌",
      "🫶",
      "🤝",
      "🙏",
    ],
  },
  {
    label: "Hearts",
    items: [
      "❤️",
      "🧡",
      "💛",
      "💚",
      "💙",
      "💜",
      "🖤",
      "🤍",
      "🤎",
      "💔",
      "❤️‍🔥",
      "❤️‍🩹",
      "💕",
      "💞",
      "💓",
      "💗",
      "💖",
      "💘",
      "💝",
      "💟",
    ],
  },
  {
    label: "Objects",
    items: [
      "🎉",
      "🎊",
      "🎁",
      "🏆",
      "🥇",
      "🎯",
      "🔥",
      "⚡",
      "✨",
      "💫",
      "🌟",
      "⭐",
      "🌈",
      "☀️",
      "🌙",
      "💎",
      "🔑",
      "🗝",
      "🔐",
      "🔒",
    ],
  },
  {
    label: "Symbols",
    items: [
      "✅",
      "❌",
      "⚠️",
      "ℹ️",
      "💯",
      "🔆",
      "🔇",
      "🔔",
      "🔕",
      "📢",
      "📣",
      "💬",
      "💭",
      "🗯",
      "♻️",
      "✔️",
      "➕",
      "➖",
      "➗",
      "✖️",
    ],
  },
]

interface EmojiPickerProps {
  recentEmoji: string[]
  onSelect: (emoji: string) => void
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement | null>
}

export function EmojiPicker({
  recentEmoji,
  onSelect,
  onClose,
  anchorRef,
}: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(0)
  const pickerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        pickerRef.current &&
        !pickerRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose, anchorRef])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e as unknown as KeyboardEvent).key === "Escape") onClose()
    }
    document.addEventListener("keydown", handler as unknown as EventListener)
    return () =>
      document.removeEventListener(
        "keydown",
        handler as unknown as EventListener,
      )
  }, [onClose])

  // Keyboard navigation within grid
  const handleGridKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const items = gridRef.current?.querySelectorAll<HTMLButtonElement>("button")
    if (!items) return
    const focused = document.activeElement as HTMLElement
    const idx = Array.from(items).indexOf(focused as HTMLButtonElement)
    const cols = 8
    let next = idx
    if (e.key === "ArrowRight") next = Math.min(idx + 1, items.length - 1)
    else if (e.key === "ArrowLeft") next = Math.max(idx - 1, 0)
    else if (e.key === "ArrowDown")
      next = Math.min(idx + cols, items.length - 1)
    else if (e.key === "ArrowUp") next = Math.max(idx - cols, 0)
    else return
    e.preventDefault()
    items[next]?.focus()
  }, [])

  return (
    <div
      ref={pickerRef}
      role="dialog"
      aria-label="Emoji picker"
      aria-modal="true"
      className={cn(
        "absolute bottom-full mb-2 left-0 z-50",
        "w-72 rounded-2xl border border-border-strong bg-card shadow-lg",
        "ds-slide-up",
      )}
    >
      {/* Pinned row */}
      <div
        className="flex items-center gap-1 border-b border-border px-3 py-2"
        role="group"
        aria-label="Frequently used"
      >
        {PINNED_EMOJI.map((e) => (
          <EmojiButton key={e} emoji={e} onSelect={onSelect} />
        ))}
      </div>

      {/* Recent row */}
      {recentEmoji.length > 0 && (
        <div className="border-b border-border px-3 py-2">
          <p className="label-mono mb-1.5">Recent</p>
          <div className="flex flex-wrap gap-0.5">
            {recentEmoji.map((e) => (
              <EmojiButton key={e} emoji={e} onSelect={onSelect} />
            ))}
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div
        className="flex border-b border-border overflow-x-auto"
        role="tablist"
        aria-label="Emoji categories"
      >
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button
            key={cat.label}
            role="tab"
            aria-selected={i === activeCategory}
            onClick={() => setActiveCategory(i)}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors",
              i === activeCategory
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div
        ref={gridRef}
        onKeyDown={handleGridKeyDown}
        role="grid"
        aria-label={EMOJI_CATEGORIES[activeCategory].label}
        className="grid grid-cols-8 gap-0.5 p-3 max-h-36 overflow-y-auto"
      >
        {EMOJI_CATEGORIES[activeCategory].items.map((e) => (
          <EmojiButton key={e} emoji={e} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}

function EmojiButton({
  emoji,
  onSelect,
}: {
  emoji: string
  onSelect: (e: string) => void
}) {
  return (
    <button
      onClick={() => onSelect(emoji)}
      aria-label={emoji}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg text-lg",
        "transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "select-none leading-none",
      )}
    >
      {emoji}
    </button>
  )
}


