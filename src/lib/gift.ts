import type { GiftOptions } from "@/types/customization";

export type { GiftOptions };

export const GIFT_STORAGE_KEY = "nadeen_gift_options";

export type GiftBoxType = GiftOptions["gift_box"];

export const GIFT_BOX_OPTIONS: { value: GiftBoxType; label: string }[] = [
  { value: "standard", label: "تغليف فاخر قياسي" },
  { value: "luxury_box", label: "صندوق هدايا فاخر" },
  { value: "luxury_ribbon", label: "صندوق فاخر مع شريط ذهبي" },
];

export function getGiftBoxLabel(value: GiftBoxType): string {
  return GIFT_BOX_OPTIONS.find((o) => o.value === value)?.label ?? value;
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
