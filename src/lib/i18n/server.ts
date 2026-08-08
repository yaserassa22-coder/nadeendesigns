import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_COOKIE,
  normalizeEnabledLocales,
  parseLocale,
  resolveEnabledLocale,
} from "./config";
import type { Locale } from "./types";

/** Raw cookie preference — used by admin UI. */
export async function getPreferredLocale(): Promise<Locale> {
  try {
    const jar = await cookies();
    return parseLocale(jar.get(LOCALE_COOKIE)?.value);
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** Admin-managed storefront language list. */
export async function getStorefrontLocales(): Promise<Locale[]> {
  try {
    const { getStoreSettings } = await import("@/lib/store/settings");
    const settings = await getStoreSettings(true);
    return normalizeEnabledLocales(settings.general.enabled_locales);
  } catch {
    return [...LOCALES];
  }
}

/**
 * Customer-facing locale: always one of the admin-enabled languages.
 * Ignores cookie preferences that were turned off in Settings → General.
 */
export async function getStorefrontLocale(): Promise<Locale> {
  const preferred = await getPreferredLocale();
  try {
    const { getStoreSettings } = await import("@/lib/store/settings");
    const settings = await getStoreSettings(true);
    const enabled = normalizeEnabledLocales(settings.general.enabled_locales);
    return resolveEnabledLocale(
      preferred,
      enabled,
      settings.general.language
    );
  } catch {
    return preferred;
  }
}

/**
 * Locale for the current request.
 * Prefer personal cookie (admin UI). Storefront pages should call
 * `getStorefrontLocale()` so customers are forced to enabled languages.
 */
export async function getLocale(): Promise<Locale> {
  return getPreferredLocale();
}
