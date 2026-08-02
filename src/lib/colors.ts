import { COLOR_LEGACY_MAP, DRESS_COLORS } from "@/lib/constants";

export type DressColor = (typeof DRESS_COLORS)[number];

/** Normalize any stored color value to the current Arabic option (or keep as-is). */
export function normalizeDressColor(
  color: string | null | undefined
): string | null {
  if (!color) return null;
  const trimmed = color.trim();
  if ((DRESS_COLORS as readonly string[]).includes(trimmed)) {
    return trimmed;
  }
  return COLOR_LEGACY_MAP[trimmed] ?? trimmed;
}

export function getDressColorLabel(color: string | null | undefined): string {
  return normalizeDressColor(color) ?? "";
}
