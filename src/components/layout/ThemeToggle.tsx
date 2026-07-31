import { useTheme, type ThemePreference } from "../../state/ThemeProvider"
import { cn } from "../../lib/utils"

const options: { value: ThemePreference label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Auto" },
]

export function ThemeToggle() {
  const { preference, setPreference } = useTheme()
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex items-center border border-border"
    >
      {options.map(({ value, label }) => (
        <button
          key={value}
          role="radio"
          aria-checked={preference === value}
          onClick={() => setPreference(value)}
          className={cn(
            "flex-1 border-r border-border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors last:border-r-0",
            preference === value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
