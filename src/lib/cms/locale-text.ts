/**
 * Arabic-first locale helpers for CMS / DB text fields.
 *
 * Fallbacks (documented):
 * - Preferred locale field when non-empty
 * - Always fall back to Arabic when HE/EN (or other) is missing
 * - Then remaining locales, then `fallback`
 *
 * Hebrew (`*_he`) is optional on CMS surfaces — schema-ready via JSON settings
 * without requiring a migration.
 *
 * For storefront marketing chrome (hero, CTAs), use `pickCmsOrUi` so HE/EN
 * mode is never stuck on Arabic when the matching CMS field is empty.
 */

import type { Locale } from "@/lib/i18n/types";

export function pickAr(
  ar: string | undefined | null,
  fallback = ""
): string {
  return (ar ?? "").trim() ? String(ar) : fallback;
}

function nonEmpty(value: string | undefined | null): string | null {
  const t = (value ?? "").trim();
  return t ? String(value) : null;
}

/**
 * Resolve a localized string from AR / HE / EN fields.
 * Missing HE/EN → Arabic. Arabic missing → other locales → fallback.
 */
export function pickLocalized(
  ar: string | undefined | null,
  en: string | undefined | null,
  fallback = "",
  locale: Locale = "ar",
  he?: string | undefined | null
): string {
  const byLocale: Record<Locale, string | null> = {
    ar: nonEmpty(ar),
    he: nonEmpty(he),
    en: nonEmpty(en),
  };

  const preferred = byLocale[locale];
  if (preferred) return preferred;

  // Constitution: Arabic is primary fallback for missing HE/EN.
  if (locale !== "ar" && byLocale.ar) return byLocale.ar;

  for (const code of ["ar", "he", "en"] as const) {
    if (code === locale) continue;
    const v = byLocale[code];
    if (v) return v;
  }

  return fallback;
}

/**
 * Storefront marketing copy: CMS locale field → UI dictionary for that locale
 * → Arabic CMS → other CMS → UI Arabic.
 *
 * Use this for hero / homepage / about chrome so switching to Hebrew/English
 * never leaves the customer on Arabic when HE/EN CMS fields are empty.
 */
export function pickCmsOrUi(
  fields: {
    ar?: string | null;
    he?: string | null;
    en?: string | null;
  },
  locale: Locale,
  uiDefaults: { ar: string; he: string; en: string }
): string {
  const byLocale: Record<Locale, string | null> = {
    ar: nonEmpty(fields.ar),
    he: nonEmpty(fields.he),
    en: nonEmpty(fields.en),
  };

  if (byLocale[locale]) return byLocale[locale]!;

  const ui = nonEmpty(uiDefaults[locale]);
  if (ui) return ui;

  if (byLocale.ar) return byLocale.ar;

  for (const code of ["ar", "he", "en"] as const) {
    if (code === locale) continue;
    if (byLocale[code]) return byLocale[code]!;
    const otherUi = nonEmpty(uiDefaults[code]);
    if (otherUi) return otherUi;
  }

  return uiDefaults.ar || "";
}

/**
 * Convenience when you have a bag of `*_ar` / `*_he` / `*_en` sibling keys.
 */
export function pickLocalizedFields(
  fields: {
    ar?: string | null;
    he?: string | null;
    en?: string | null;
  },
  locale: Locale = "ar",
  fallback = ""
): string {
  return pickLocalized(fields.ar, fields.en, fallback, locale, fields.he);
}

/**
 * Split a title so the emphasis substring is bold+underlined when present.
 * Returns null emphasis when the substring is missing (render title plain).
 * Folds trailing English articles ("the" / "a" / "an") into the emphasis so
 * they never sit alone on the previous line when the emphasis wraps.
 */
export function splitTitleEmphasis(
  title: string,
  emphasis: string
): { before: string; emphasis: string; after: string } | null {
  const e = emphasis.trim();
  if (!e) return null;
  const idx = title.indexOf(e);
  if (idx < 0) return null;

  let before = title.slice(0, idx);
  let emph = e;
  const orphan = before.match(/^(.*?)(\s+)(the|a|an)(\s+)$/i);
  if (orphan) {
    before = `${orphan[1]}${orphan[2]}`;
    emph = `${orphan[3]} ${emph}`;
  }

  return {
    before,
    emphasis: emph,
    after: title.slice(idx + e.length),
  };
}
