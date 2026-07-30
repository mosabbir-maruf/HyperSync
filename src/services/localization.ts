export type MessageKey = string
export type MessageValues = Record<string, string | number>

export interface LocalizationService {
  translate(key: MessageKey, values?: MessageValues): string
}

/** English catalog implementation; callers depend on the interface, not a UI framework. */
export class EnglishLocalizationService implements LocalizationService {
  translate(key: MessageKey, values: MessageValues = {}): string {
    return key.replace(/\{(\w+)\}/g, (_, name: string) =>
      String(values[name] ?? `{${name}}`),
    )
  }
}

export const localization: LocalizationService =
  new EnglishLocalizationService()
