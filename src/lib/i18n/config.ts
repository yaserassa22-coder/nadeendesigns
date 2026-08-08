import type { Locale, LocaleDirection } from "./types";

/** Cookie readable by client + server (not httpOnly). */
export const LOCALE_COOKIE = "nd_locale";

/** localStorage key — mirrors cookie for resilience across navigations. */
export const LOCALE_STORAGE_KEY = "nd_locale";

export const DEFAULT_LOCALE: Locale = "ar";

export const LOCALES: readonly Locale[] = ["ar", "he", "en"] as const;

export const LOCALE_META: Record<
  Locale,
  {
    nativeName: string;
    englishName: string;
    htmlLang: string;
    dir: LocaleDirection;
    /** Short mark shown beside the option (not a sticker overlay). */
    mark: string;
  }
> = {
  ar: {
    nativeName: "العربية",
    englishName: "Arabic",
    htmlLang: "ar",
    dir: "rtl",
    mark: "ع",
  },
  he: {
    nativeName: "עברית",
    englishName: "Hebrew",
    htmlLang: "he",
    dir: "rtl",
    mark: "ע",
  },
  en: {
    nativeName: "English",
    englishName: "English",
    htmlLang: "en",
    dir: "ltr",
    mark: "En",
  },
};

export function isLocale(value: unknown): value is Locale {
  return value === "ar" || value === "he" || value === "en";
}

export function parseLocale(value: unknown): Locale {
  if (typeof value !== "string") return DEFAULT_LOCALE;
  const normalized = value.trim().toLowerCase().slice(0, 2);
  return isLocale(normalized) ? normalized : DEFAULT_LOCALE;
}

/** Keep catalog order; fall back to full list when empty/invalid. */
export function normalizeEnabledLocales(raw: unknown): Locale[] {
  const picked = Array.isArray(raw)
    ? [...new Set(raw.filter(isLocale))]
    : [];
  const ordered = LOCALES.filter((code) => picked.includes(code));
  return ordered.length > 0 ? ordered : [...LOCALES];
}

/** Prefer cookie/choice when enabled; else default language; else first enabled. */
export function resolveEnabledLocale(
  preferred: unknown,
  enabled: readonly Locale[],
  storeDefault?: unknown
): Locale {
  const list =
    enabled.length > 0 ? enabled : ([...LOCALES] as Locale[]);
  const pref =
    typeof preferred === "string" && isLocale(preferred.trim().toLowerCase().slice(0, 2))
      ? (preferred.trim().toLowerCase().slice(0, 2) as Locale)
      : null;
  if (pref && list.includes(pref)) return pref;
  const fallback = parseLocale(storeDefault ?? list[0]);
  if (list.includes(fallback)) return fallback;
  return list[0] ?? DEFAULT_LOCALE;
}

export function localeDir(locale: Locale): LocaleDirection {
  return LOCALE_META[locale].dir;
}

export function localeHtmlLang(locale: Locale): string {
  return LOCALE_META[locale].htmlLang;
}

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
