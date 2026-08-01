/** Merge conditional class names. Falsy values are dropped. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ")
}

/** Cryptographically-random session id. Never Math.random (vision: SECURITY). */
export function randomId(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no ambiguous 0/O/1/I

/** Human-friendly pairing code, e.g. "K7P-2QF". Secure RNG. */
export function generatePairingCode(length = 6): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let out = ""
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
    if (i === 2 && length > 3) out += "-"
  }
  return out
}

/** Normalize a typed/scanned code to the canonical dashed uppercase form. */
export function normalizeCode(raw: string): string {
  const clean = raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6)
  return clean.length > 3 ? `${clean.slice(0, 3)}-${clean.slice(3)}` : clean
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes <= 0) return "0 B"
  const k = 1024
  const units = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    units.length - 1,
  )
  const value = bytes / Math.pow(k, i)
  return `${value.toFixed(i === 0 ? 0 : decimals)} ${units[i]}`
}

export function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`
}

export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "—"
  if (seconds < 60) return `${Math.ceil(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s.toString().padStart(2, "0")}s`
}

/**
 * Escape a peer-supplied filename for safe display and download.
 * Vision (SECURITY): escape filenames, never trust peer input.
 */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "file"
  const cleaned = base
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/[<>:"/\\|?*]/g, "_")
    .trim()
  return cleaned.length ? cleaned.slice(0, 255) : "file"
}

/** Stable per-file/transfer id. */
export function makeTransferId(): string {
  return `tx_${randomId().slice(0, 8)}`
}

/** Clamp a number into [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max)
}

// Avatar palette — vivid enough to pop on dark backgrounds, works on light too.
const AVATAR_COLORS = [
  "#cf4322", // rust (brand)
  "#d97706", // amber
  "#059669", // emerald
  "#0891b2", // cyan
  "#7c3aed", // violet
  "#db2777", // pink
  "#ea580c", // orange
  "#16a34a", // green
]

function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Deterministic accent color for a device name/id. */
export function avatarColor(seed: string): string {
  return AVATAR_COLORS[hashString(seed) % AVATAR_COLORS.length]
}

/** Up to two initials from a display name. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "??"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export const MARVEL_CHARACTERS = [
  "Iron Man",
  "Spider-Man",
  "Thor",
  "Hulk",
  "Black Widow",
  "Captain America",
  "Doctor Strange",
  "Black Panther",
  "Captain Marvel",
  "Wolverine",
  "Deadpool",
  "Ant-Man",
  "Scarlet Witch",
  "Vision",
  "Hawkeye",
  "Daredevil",
  "Star-Lord",
  "Groot",
  "Rocket Raccoon",
  "Gamora",
  "Drax",
]

const HAS_AVATAR_IMAGE = new Set([
  "Iron Man",
  "Spider-Man",
  "Thor",
  "Hulk",
  "Black Widow",
  "Captain America",
  "Doctor Strange",
  "Black Panther",
  "Captain Marvel",
  "Wolverine",
  "Vision",
  "Drax",
])

/** Returns the local URL for a Marvel avatar if the name matches and we generated one, otherwise null. */
export function getMarvelAvatarUrl(name: string): string | null {
  if (HAS_AVATAR_IMAGE.has(name)) {
    const safeFilename = name.toLowerCase().replace(/[^a-z0-9]/g, "-")
    return `/avatars/${safeFilename}.jpg`
  }
  return null
}

/** Coarse platform label derived from the user agent. */
export function detectPlatform(): string {
  return getCapabilities().platform
}
import { getCapabilities } from "./capabilities"
