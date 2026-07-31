import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "../../lib/utils"

type Variant = "primary" | "secondary" | "ghost" | "danger"
type Size = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
}

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-[color-mix(in_srgb,var(--primary)_88%,#000)] active:translate-y-px",
  secondary:
    "bg-transparent text-foreground border border-border-strong hover:bg-secondary active:translate-y-px",
  ghost: "text-muted-foreground hover:text-foreground hover:bg-secondary",
  danger:
    "bg-destructive text-destructive-foreground hover:bg-[color-mix(in_srgb,var(--destructive)_88%,#000)]",
}

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[12px] gap-1.5",
  md: "h-10 px-4 text-[13px] gap-2",
  lg: "h-12 px-6 text-sm gap-2",
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium transition-all duration-150",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:opacity-40 disabled:pointer-events-none select-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}

export function IconButton({
  className,
  children,
  label,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground",
        "transition-colors hover:bg-secondary hover:text-foreground",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:opacity-40 disabled:pointer-events-none",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
