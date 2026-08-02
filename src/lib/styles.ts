import { DRESS_STYLES, STYLE_LEGACY_MAP } from "@/lib/constants";

export type DressStyle = (typeof DRESS_STYLES)[number];

/** Normalize any stored style value to the current Arabic option (or keep as-is). */
export function normalizeDressStyle(style: string | null | undefined): string | null {
  if (!style) return null;
  const trimmed = style.trim();
  if ((DRESS_STYLES as readonly string[]).includes(trimmed)) {
    return trimmed;
  }
  return STYLE_LEGACY_MAP[trimmed] ?? trimmed;
}

export function getDressStyleLabel(style: string | null | undefined): string {
  return normalizeDressStyle(style) ?? "";
}
