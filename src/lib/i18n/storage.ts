/**
 * Client-side locale persistence (cookie + localStorage).
 * Cookie is intentionally readable (not httpOnly) so SSR can see the choice
 * after refresh without an API round-trip.
 */

import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_STORAGE_KEY,
  parseLocale,
  localeDir,
  localeHtmlLang,
} from "./config";
import type { Locale } from "./types";

export function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const fromStorage = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (fromStorage) return parseLocale(fromStorage);
  } catch {
    /* private mode */
  }
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`)
  );
  if (match?.[1]) return parseLocale(decodeURIComponent(match[1]));
  return null;
}

export function persistLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  const secure =
    typeof location !== "undefined" && location.protocol === "https:";
  document.cookie = [
    `${LOCALE_COOKIE}=${encodeURIComponent(locale)}`,
    "path=/",
    `max-age=${LOCALE_COOKIE_MAX_AGE}`,
    "samesite=lax",
    secure ? "secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

/** Apply lang/dir on <html> for immediate chrome updates. */
export function applyDocumentLocale(locale: Locale): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.lang = localeHtmlLang(locale);
  root.dir = localeDir(locale);
  root.dataset.locale = locale;
}
