/**
 * Arabic-first locale helpers. English (`*_en`) is schema-ready for later
 * without DB changes — Phase A always prefers Arabic.
 */

export function pickAr(
  ar: string | undefined | null,
  fallback = ""
): string {
  return (ar ?? "").trim() ? String(ar) : fallback;
}

/**
 * Prefer Arabic; fall back to English then default.
 * Ready for a future locale switcher without schema changes.
 */
export function pickLocalized(
  ar: string | undefined | null,
  en: string | undefined | null,
  fallback = "",
  locale: "ar" | "en" = "ar"
): string {
  if (locale === "en") {
    if ((en ?? "").trim()) return String(en);
    if ((ar ?? "").trim()) return String(ar);
    return fallback;
  }
  if ((ar ?? "").trim()) return String(ar);
  if ((en ?? "").trim()) return String(en);
  return fallback;
}

/**
 * Split a title so the emphasis substring is bold+underlined when present.
 * Returns null emphasis when the substring is missing (render title plain).
 */
export function splitTitleEmphasis(
  title: string,
  emphasis: string
): { before: string; emphasis: string; after: string } | null {
  const e = emphasis.trim();
  if (!e) return null;
  const idx = title.indexOf(e);
  if (idx < 0) return null;
  return {
    before: title.slice(0, idx),
    emphasis: e,
    after: title.slice(idx + e.length),
  };
}
