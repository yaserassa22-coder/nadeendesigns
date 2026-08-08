/**
 * Product personalization engine (Sprint 2 Phase 1).
 *
 * Wraps existing veil/robe personalization — does NOT rewrite logic.
 * Adapters call current code paths in `@/lib/personalization` and
 * `@/lib/validations/personalization` so PDP/customize UX stays identical.
 *
 * Future product types can reuse this API without forking veil/robe flows.
 */

export {
  PERSONALIZATION_STORAGE_KEY,
  WRITING_LANGUAGE_OPTIONS,
  ARABIC_FONT_OPTIONS,
  ENGLISH_FONT_OPTIONS,
  WRITING_COLOR_OPTIONS,
  ROBE_POSITION_OPTIONS,
  VEIL_POSITION_OPTIONS,
  ARABIC_FONT_CLASS,
  ENGLISH_FONT_CLASS,
  englishFontFromPrimary,
  getWritingColorHex,
  getWritingLanguageLabel,
  getArabicFontLabel,
  getEnglishFontLabel,
  getWritingColorLabel,
  getPositionLabel,
  writingLanguageSelectOptions,
  arabicFontSelectOptions,
  englishFontSelectOptions,
  writingColorSelectOptions,
  positionSelectOptions,
  supportsPersonalization,
  categoryToServiceType,
  savePersonalization,
  loadPersonalization,
  clearPersonalization,
  type WritingLanguage,
  type ArabicFont,
  type EnglishFont,
  type WritingColor,
  type WritingPosition,
  type RobePosition,
  type VeilPosition,
  type PersonalizationProductType,
  type ProductPersonalization,
} from "@/lib/personalization";

export { productPersonalizationSchema } from "@/lib/validations/personalization";

import type { ProductPersonalization } from "@/lib/personalization";
import {
  positionSelectOptions,
  type PersonalizationProductType,
} from "@/lib/personalization";
import type { Locale } from "@/lib/i18n/types";
import { productPersonalizationSchema } from "@/lib/validations/personalization";
import type { ShopProductType } from "@/types/shop";

/** Map cart/shop entity kind → personalization payload product_type. */
export function shopTypeToPersonalizationType(
  shopType: ShopProductType
): PersonalizationProductType | null {
  if (shopType === "veil") return "veils";
  if (shopType === "bridal_robe") return "robes";
  return null;
}

/** Position options for a personalization product kind (localized). */
export function getPersonalizationPositionOptions(
  type: PersonalizationProductType,
  locale: Locale = "ar"
) {
  return positionSelectOptions(type, locale);
}

/**
 * Validate personalization using the existing Zod schema.
 * Returns the parsed payload or a field-error map (same contract as today).
 */
export function validatePersonalization(
  data: unknown
):
  | { ok: true; data: ProductPersonalization }
  | { ok: false; fieldErrors: Record<string, string> } {
  const parsed = productPersonalizationSchema.safeParse(data);
  if (parsed.success) {
    return { ok: true, data: parsed.data as ProductPersonalization };
  }
  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.join(".") || "form";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false, fieldErrors };
}

/** Whether this shop product supports embroidery personalization today. */
export function shopProductSupportsPersonalization(
  shopType: ShopProductType
): boolean {
  return shopTypeToPersonalizationType(shopType) != null;
}
