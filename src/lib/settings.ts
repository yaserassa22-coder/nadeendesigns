import type { SiteSettings } from "@/types";
import {
  DEFAULT_SETTINGS,
  OFFICIAL_INSTAGRAM_HANDLE,
  OFFICIAL_INSTAGRAM_URL,
} from "@/lib/constants";

/** Merge DB JSON with defaults (shipping fields may be missing on old settings rows). */
export function normalizeSiteSettings(
  raw?: Partial<SiteSettings> | null
): SiteSettings {
  const settings = { ...DEFAULT_SETTINGS, ...(raw ?? {}) };
  return {
    ...settings,
    shipping_enabled:
      typeof raw?.shipping_enabled === "boolean"
        ? raw.shipping_enabled
        : DEFAULT_SETTINGS.shipping_enabled,
    shipping_flat_fee:
      typeof raw?.shipping_flat_fee === "number" &&
      Number.isFinite(raw.shipping_flat_fee)
        ? Math.max(0, raw.shipping_flat_fee)
        : DEFAULT_SETTINGS.shipping_flat_fee,
    shipping_free_threshold:
      typeof raw?.shipping_free_threshold === "number" &&
      Number.isFinite(raw.shipping_free_threshold)
        ? Math.max(0, raw.shipping_free_threshold)
        : DEFAULT_SETTINGS.shipping_free_threshold,
    instagram_url: OFFICIAL_INSTAGRAM_URL,
    instagram_handle: OFFICIAL_INSTAGRAM_HANDLE,
  };
}
