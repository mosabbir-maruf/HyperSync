export interface Logger {
  debug(message: string, context?: unknown): void
  warn(message: string, context?: unknown): void
}

/** Development-only diagnostics. Production builds remain silent by design. */
export class DevelopmentLogger implements Logger {
  debug(message: string, context?: unknown): void {
    if (import.meta.env.DEV) console.debug(`[LocalShare] ${message}`, context)
  }

  warn(message: string, context?: unknown): void {
    if (import.meta.env.DEV) console.warn(`[LocalShare] ${message}`, context)
  }
}

export const logger: Logger = new DevelopmentLogger()
