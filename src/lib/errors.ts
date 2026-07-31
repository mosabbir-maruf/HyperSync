/**
 * Centralized error handling. The rest of the app never surfaces raw
 * exceptions — everything funnels through `toAppError`, which categorizes the
 * failure and produces a message safe to show a human. Pure module (no React).
 */

export type ErrorCategory = "permission" | "browser" | "network" | "protocol" | "storage" | "transfer" | "verification" | "unknown"

export interface AppError {
  category: ErrorCategory
  /** Short, human-friendly summary suitable for a toast or dialog. */
  message: string
  /** Optional remediation hint. */
  hint?: string
  /** The original throwable, retained for logging — never shown to users. */
  cause?: unknown
}

const CATEGORY_FALLBACK: Record<ErrorCategory, {
  message: string
  hint?: string
}> = {
  permission: {
    message: "Permission was denied.",
    hint: "Check your browser's site permissions and try again.",
  },
  browser: {
    message: "Your browser doesn't support this feature.",
    hint: "Try a recent version of Chrome, Edge, Safari, or Firefox.",
  },
  network: {
    message: "The connection dropped.",
    hint: "Check your network and reconnect to the peer.",
  },
  protocol: {
    message: "Received an unexpected message from the peer.",
    hint: "The other device may be on a different version.",
  },
  storage: {
    message: "Couldn't access local storage.",
    hint: "Private-browsing mode can block this.",
  },
  transfer: { message: "The transfer failed." },
  verification: {
    message: "The received file failed its integrity check.",
    hint: "Ask the sender to try again.",
  },
  unknown: { message: "Something went wrong." },
}

/** Construct an AppError explicitly. */
export function appError(
  category: ErrorCategory,
  message?: string,
  opts: { hint?: string cause?: unknown } = {},
): AppError {
  const fallback = CATEGORY_FALLBACK[category]
  return {
    category,
    message: message ?? fallback.message,
    hint: opts.hint ?? fallback.hint,
    cause: opts.cause,
  }
}

/** Best-effort mapping of any thrown value into a categorized AppError. */
export function toAppError(err: unknown): AppError {
  if (isAppError(err)) return err

  const raw = err instanceof Error ? err : new Error(String(err))
  const name = raw.name
  const text = `${name} ${raw.message}`.toLowerCase()

  let category: ErrorCategory = "unknown"
  if (
    name === "NotAllowedError" ||
    name === "SecurityError" ||
    text.includes("permission")
  ) {
    category = "permission"
  } else if (
    name === "NotSupportedError" ||
    text.includes("not supported") ||
    text.includes("unsupported")
  ) {
    category = "browser"
  } else if (
    name === "NotFoundError" ||
    text.includes("ice") ||
    text.includes("network") ||
    text.includes("connection") ||
    text.includes("datachannel")
  ) {
    category = "network"
  } else if (
    text.includes("quota") ||
    text.includes("indexeddb") ||
    text.includes("storage")
  ) {
    category = "storage"
  } else if (
    text.includes("protocol") ||
    text.includes("malformed") ||
    text.includes("unexpected message")
  ) {
    category = "protocol"
  } else if (
    text.includes("checksum") ||
    text.includes("integrity") ||
    text.includes("verif")
  ) {
    category = "verification"
  } else if (text.includes("transfer") || text.includes("chunk")) {
    category = "transfer"
  }

  const fallback = CATEGORY_FALLBACK[category]
  // Prefer the fallback copy for `unknown` (raw messages are rarely friendly).
  const message =
    category === "unknown" ? fallback.message : raw.message || fallback.message
  return { category, message, hint: fallback.hint, cause: raw }
}

export function isAppError(v: unknown): v is AppError {
  return (
    typeof v === "object" &&
    v !== null &&
    "category" in v &&
    "message" in v &&
    typeof (v as AppError).message === "string"
  )
}
