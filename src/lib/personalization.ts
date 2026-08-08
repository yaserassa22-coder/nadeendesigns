import type { ProductPersonalization } from "@/types/customization";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";

export type { ProductPersonalization };

export const PERSONALIZATION_STORAGE_KEY = "nadeen_product_personalization";

export type WritingLanguage = ProductPersonalization["writing_language"];
export type ArabicFont = ProductPersonalization["font_ar"];
export type EnglishFont = ProductPersonalization["font_en"];
export type WritingColor = ProductPersonalization["color"];
export type WritingPosition = ProductPersonalization["position"];
export type RobePosition = "back" | "chest" | "sleeve";
export type VeilPosition = "bottom_corner" | "center" | "custom";
export type PersonalizationProductType = "veils" | "robes";

/** Stable option values (labels come from dictionary / helpers). */
export const WRITING_LANGUAGE_OPTIONS: { value: WritingLanguage }[] = [
  { value: "ar" },
  { value: "en" },
  { value: "both" },
];

export const ARABIC_FONT_OPTIONS: { value: ArabicFont }[] = [
  { value: "classic_ar" },
  { value: "diwani" },
  { value: "naskh" },
  { value: "signature_ar" },
  { value: "kufi" },
  { value: "el_messiri" },
  { value: "cairo" },
  { value: "lateef" },
  { value: "elegant_script" },
  { value: "modern_script" },
  { value: "luxury_serif" },
  { value: "classic_serif" },
  { value: "parisienne" },
  { value: "dancing_script" },
  { value: "cinzel" },
  { value: "pinyon" },
  { value: "frank_ruhl" },
  { value: "heebo" },
  { value: "rubik" },
];

export const ENGLISH_FONT_OPTIONS: { value: EnglishFont }[] = [
  { value: "elegant_script" },
  { value: "modern_script" },
  { value: "luxury_serif" },
  { value: "classic_serif" },
];

export const WRITING_COLOR_OPTIONS: {
  value: WritingColor;
  hex: string;
}[] = [
  { value: "gold", hex: "#c9a96e" },
  { value: "silver", hex: "#b8b8b8" },
  { value: "white", hex: "#ffffff" },
  { value: "black", hex: "#2c2419" },
  { value: "champagne", hex: "#f7e7ce" },
  { value: "rose_gold", hex: "#b76e79" },
];

export const ROBE_POSITION_OPTIONS: { value: RobePosition }[] = [
  { value: "back" },
  { value: "chest" },
  { value: "sleeve" },
];

export const VEIL_POSITION_OPTIONS: { value: VeilPosition }[] = [
  { value: "bottom_corner" },
  { value: "center" },
  { value: "custom" },
];

export const ARABIC_FONT_CLASS: Record<ArabicFont, string> = {
  classic_ar: "font-personalize-classic-ar",
  diwani: "font-personalize-diwani",
  naskh: "font-personalize-naskh",
  signature_ar: "font-personalize-signature-ar",
  kufi: "font-personalize-kufi",
  el_messiri: "font-personalize-el-messiri",
  cairo: "font-personalize-cairo",
  lateef: "font-personalize-lateef",
  elegant_script: "font-personalize-elegant",
  modern_script: "font-personalize-modern",
  luxury_serif: "font-personalize-luxury",
  classic_serif: "font-personalize-classic-en",
  parisienne: "font-personalize-parisienne",
  dancing_script: "font-personalize-dancing",
  cinzel: "font-personalize-cinzel",
  pinyon: "font-personalize-pinyon",
  frank_ruhl: "font-personalize-frank-ruhl",
  heebo: "font-personalize-heebo",
  rubik: "font-personalize-rubik",
};

export const ENGLISH_FONT_CLASS: Record<EnglishFont, string> = {
  elegant_script: "font-personalize-elegant",
  modern_script: "font-personalize-modern",
  luxury_serif: "font-personalize-luxury",
  classic_serif: "font-personalize-classic-en",
};

/** Sync font_en when a Latin script is chosen as the primary (font_ar) font. */
export function englishFontFromPrimary(font: ArabicFont): EnglishFont {
  if (
    font === "elegant_script" ||
    font === "modern_script" ||
    font === "luxury_serif" ||
    font === "classic_serif"
  ) {
    return font;
  }
  return "elegant_script";
}

export function getWritingColorHex(color: WritingColor): string {
  return (
    WRITING_COLOR_OPTIONS.find((c) => c.value === color)?.hex ?? "#c9a96e"
  );
}

export function getWritingLanguageLabel(
  value: WritingLanguage,
  locale: Locale = "ar"
): string {
  return getDictionary(locale).personalizationLabels.languages[value] ?? value;
}

export function getArabicFontLabel(
  value: ArabicFont,
  locale: Locale = "ar"
): string {
  return (
    getDictionary(locale).personalizationLabels.arabicFonts[value] ?? value
  );
}

export function getEnglishFontLabel(
  value: EnglishFont,
  locale: Locale = "ar"
): string {
  return (
    getDictionary(locale).personalizationLabels.englishFonts[value] ?? value
  );
}

export function getWritingColorLabel(
  value: WritingColor,
  locale: Locale = "ar"
): string {
  return getDictionary(locale).personalizationLabels.colors[value] ?? value;
}

export function getPositionLabel(
  position: WritingPosition,
  productType: "veils" | "robes",
  locale: Locale = "ar"
): string {
  const labels = getDictionary(locale).personalizationLabels;
  if (productType === "robes") {
    return labels.robePositions[position as RobePosition] ?? position;
  }
  return labels.veilPositions[position as VeilPosition] ?? position;
}

/** Localized select options for forms. */
export function writingLanguageSelectOptions(locale: Locale = "ar") {
  return WRITING_LANGUAGE_OPTIONS.map((o) => ({
    value: o.value,
    label: getWritingLanguageLabel(o.value, locale),
  }));
}

export function arabicFontSelectOptions(locale: Locale = "ar") {
  return ARABIC_FONT_OPTIONS.map((o) => ({
    value: o.value,
    label: getArabicFontLabel(o.value, locale),
  }));
}

export function englishFontSelectOptions(locale: Locale = "ar") {
  return ENGLISH_FONT_OPTIONS.map((o) => ({
    value: o.value,
    label: getEnglishFontLabel(o.value, locale),
  }));
}

export function writingColorSelectOptions(locale: Locale = "ar") {
  return WRITING_COLOR_OPTIONS.map((o) => ({
    value: o.value,
    label: getWritingColorLabel(o.value, locale),
    hex: o.hex,
  }));
}

export function positionSelectOptions(
  productType: PersonalizationProductType,
  locale: Locale = "ar"
) {
  const opts =
    productType === "robes" ? ROBE_POSITION_OPTIONS : VEIL_POSITION_OPTIONS;
  return opts.map((o) => ({
    value: o.value,
    label: getPositionLabel(o.value, productType, locale),
  }));
}

export function supportsPersonalization(
  category: string
): category is PersonalizationProductType {
  return category === "veils" || category === "robes";
}

export function categoryToServiceType(
  category: "veils" | "robes"
): "veil" | "bridal_cape" {
  return category === "veils" ? "veil" : "bridal_cape";
}

export function savePersonalization(data: ProductPersonalization) {
  sessionStorage.setItem(PERSONALIZATION_STORAGE_KEY, JSON.stringify(data));
}

export function loadPersonalization(): ProductPersonalization | null {
  try {
    const raw = sessionStorage.getItem(PERSONALIZATION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ProductPersonalization;
  } catch {
    return null;
  }
}

export function clearPersonalization() {
  try {
    sessionStorage.removeItem(PERSONALIZATION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
