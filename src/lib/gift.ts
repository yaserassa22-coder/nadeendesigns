import type { GiftOptions } from "@/types/customization";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";

export type { GiftOptions };

export const GIFT_STORAGE_KEY = "nadeen_gift_options";

export type GiftBoxType = GiftOptions["gift_box"];

export const GIFT_BOX_VALUES: GiftBoxType[] = [
  "standard",
  "luxury_box",
  "luxury_ribbon",
];

const AR_FALLBACK: Record<GiftBoxType, string> = {
  standard: "تغليف فاخر قياسي",
  luxury_box: "صندوق هدايا فاخر",
  luxury_ribbon: "صندوق فاخر مع شريط ذهبي",
};

/** Legacy constant — Arabic labels. Prefer getGiftBoxOptions(locale). */
export const GIFT_BOX_OPTIONS: { value: GiftBoxType; label: string }[] =
  GIFT_BOX_VALUES.map((value) => ({
    value,
    label: AR_FALLBACK[value],
  }));

export function getGiftBoxLabel(
  value: GiftBoxType,
  locale: Locale = "ar"
): string {
  const g = getDictionary(locale).gift;
  if (value === "standard") return g.boxStandard;
  if (value === "luxury_box") return g.boxLuxury;
  return g.boxRibbon;
}

export function getGiftBoxOptions(locale: Locale = "ar") {
  return GIFT_BOX_VALUES.map((value) => ({
    value,
    label: getGiftBoxLabel(value, locale),
  }));
}

export function saveGiftOptions(data: GiftOptions | null) {
  if (!data || !data.enabled) {
    sessionStorage.removeItem(GIFT_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(GIFT_STORAGE_KEY, JSON.stringify(data));
}

export function loadGiftOptions(): GiftOptions | null {
  try {
    const raw = sessionStorage.getItem(GIFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GiftOptions;
  } catch {
    return null;
  }
}

export function clearGiftOptions() {
  try {
    sessionStorage.removeItem(GIFT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
