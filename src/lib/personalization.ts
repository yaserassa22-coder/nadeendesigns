import type { ProductPersonalization } from "@/types/customization";

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

export const WRITING_LANGUAGE_OPTIONS: {
  value: WritingLanguage;
  label: string;
}[] = [
  { value: "ar", label: "العربية" },
  { value: "en", label: "English" },
  { value: "both", label: "العربية + English" },
];

export const ARABIC_FONT_OPTIONS: { value: ArabicFont; label: string }[] = [
  { value: "classic_ar", label: "عربي كلاسيكي" },
  { value: "diwani", label: "ديواني" },
  { value: "naskh", label: "نسخ" },
  { value: "signature_ar", label: "توقيع عربي" },
];

export const ENGLISH_FONT_OPTIONS: { value: EnglishFont; label: string }[] = [
  { value: "elegant_script", label: "Elegant Script" },
  { value: "modern_script", label: "Modern Script" },
  { value: "luxury_serif", label: "Luxury Serif" },
  { value: "classic_serif", label: "Classic Serif" },
];

export const WRITING_COLOR_OPTIONS: {
  value: WritingColor;
  label: string;
  hex: string;
}[] = [
  { value: "gold", label: "Gold", hex: "#c9a96e" },
  { value: "silver", label: "Silver", hex: "#b8b8b8" },
  { value: "white", label: "White", hex: "#ffffff" },
  { value: "black", label: "Black", hex: "#2c2419" },
  { value: "champagne", label: "Champagne", hex: "#f7e7ce" },
  { value: "rose_gold", label: "Rose Gold", hex: "#b76e79" },
];

export const ROBE_POSITION_OPTIONS: {
  value: RobePosition;
  label: string;
}[] = [
  { value: "back", label: "Back" },
  { value: "chest", label: "Chest" },
  { value: "sleeve", label: "Sleeve" },
];

export const VEIL_POSITION_OPTIONS: {
  value: VeilPosition;
  label: string;
}[] = [
  { value: "bottom_corner", label: "Bottom Corner" },
  { value: "center", label: "Center" },
  { value: "custom", label: "Custom Position" },
];

export const ARABIC_FONT_CLASS: Record<ArabicFont, string> = {
  classic_ar: "font-personalize-classic-ar",
  diwani: "font-personalize-diwani",
  naskh: "font-personalize-naskh",
  signature_ar: "font-personalize-signature-ar",
};

export const ENGLISH_FONT_CLASS: Record<EnglishFont, string> = {
  elegant_script: "font-personalize-elegant",
  modern_script: "font-personalize-modern",
  luxury_serif: "font-personalize-luxury",
  classic_serif: "font-personalize-classic-en",
};

export function getWritingColorHex(color: WritingColor): string {
  return (
    WRITING_COLOR_OPTIONS.find((c) => c.value === color)?.hex ?? "#c9a96e"
  );
}

export function getWritingLanguageLabel(value: WritingLanguage): string {
  return (
    WRITING_LANGUAGE_OPTIONS.find((o) => o.value === value)?.label ?? value
  );
}

export function getArabicFontLabel(value: ArabicFont): string {
  return ARABIC_FONT_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getEnglishFontLabel(value: EnglishFont): string {
  return ENGLISH_FONT_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getWritingColorLabel(value: WritingColor): string {
  return WRITING_COLOR_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getPositionLabel(
  position: WritingPosition,
  productType: "veils" | "robes"
): string {
  const options =
    productType === "robes" ? ROBE_POSITION_OPTIONS : VEIL_POSITION_OPTIONS;
  return (
    options.find((o) => o.value === position)?.label ?? position
  );
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
