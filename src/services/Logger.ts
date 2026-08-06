export interface Logger {
  debug(message: string, context?: unknown): void
  info(message: string, context?: unknown): void
  warn(message: string, context?: unknown): void
  error(message: string, context?: unknown): void
}

/** Development-only diagnostics. Production builds remain silent by design. */
export class DevelopmentLogger implements Logger {
  debug(message: string, context?: unknown): void {
    if (!import.meta.env.DEV) return
    if (context !== undefined) console.debug(`[LocalShare] ${message}`, context)
    else console.debug(`[LocalShare] ${message}`)
  }

  info(message: string, context?: unknown): void {
    if (!import.meta.env.DEV) return
    if (context !== undefined) console.info(`[LocalShare] ${message}`, context)
    else console.info(`[LocalShare] ${message}`)
  }

  warn(message: string, context?: unknown): void {
    if (!import.meta.env.DEV) return
    if (context !== undefined) console.warn(`[LocalShare] ${message}`, context)
    else console.warn(`[LocalShare] ${message}`)
  }

  error(message: string, context?: unknown): void {
    if (!import.meta.env.DEV) return
    if (context !== undefined) console.error(`[LocalShare] ${message}`, context)
    else console.error(`[LocalShare] ${message}`)
  }
}

export const logger: Logger = new DevelopmentLogger()
