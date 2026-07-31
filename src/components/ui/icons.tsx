import type { SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement>

const base = (props: IconProps) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
})

export const SendIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
)

export const DownloadIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12l7 7 7-7" />
  </svg>
)

export const ReceiveIcon = DownloadIcon

export const LinkIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 15l6-6" />
    <path d="M11 6l1-1a4 4 0 015.66 5.66l-1 1" />
    <path d="M13 18l-1 1a4 4 0 01-5.66-5.66l1-1" />
  </svg>
)

export const QrIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3M20 14v.01M14 20h.01M17 20h.01M20 17v3" />
  </svg>
)

export const CopyIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 012-2h10" />
  </svg>
)

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 12l5 5L20 6" />
  </svg>
)

export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)

export const PauseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 5v14M16 5v14" />
  </svg>
)

export const PlayIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 5l12 7-12 7V5z" />
  </svg>
)

export const RetryIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 12a9 9 0 019-9 9 9 0 016.7 3M21 3v5h-5" />
    <path d="M21 12a9 9 0 01-9 9 9 9 0 01-6.7-3M3 21v-5h5" />
  </svg>
)

export const SunIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)

export const MoonIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
  </svg>
)

export const MonitorIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </svg>
)

export const HistoryIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 12a9 9 0 109-9 9 9 0 00-7.5 4M3 4v4h4" />
    <path d="M12 8v4l3 2" />
  </svg>
)

export const SettingsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1V21a2 2 0 11-4 0v-.1A1.6 1.6 0 005.6 19l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.6 1.6 0 003 13.6H3a2 2 0 010-4h.1A1.6 1.6 0 004.6 7l-.1-.1a2 2 0 112.8-2.8l.1.1A1.6 1.6 0 0010 3.6V3a2 2 0 014 0v.1a1.6 1.6 0 002.7 1.1l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8v.1a1.6 1.6 0 001.5 1H21a2 2 0 010 4h-.1a1.6 1.6 0 00-1.5 1z" />
  </svg>
)

export const HomeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 11l8-7 8 7" />
    <path d="M6 10v9a1 1 0 001 1h10a1 1 0 001-1v-9" />
  </svg>
)

export const ShieldIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)

export const FileIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" />
    <path d="M14 3v5h5" />
  </svg>
)

export const BoltIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
  </svg>
)

export const RadarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M19.07 4.93 A 10 10 0 1 0 21 12" />
    <path d="M16.24 7.76 A 6 6 0 1 0 18 12" />
    <path d="M12 12 L 19 5" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
  </svg>
)

export const HyperSyncLogo = (p: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...p}
  >
    <path
      d="M17.5 7.5C15.6 7.5 14 8.7 13.3 10.4L12.5 12.3C11.3 15.1 8.8 16.5 6.5 16.5C4 16.5 2 14.5 2 12C2 9.5 4 7.5 6.5 7.5C8.4 7.5 10 8.7 10.7 10.4L11.5 12.3C12.7 15.1 15.2 16.5 17.5 16.5C20 16.5 22 14.5 22 12C22 9.5 20 7.5 17.5 7.5Z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
