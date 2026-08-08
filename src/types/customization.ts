/** Veil / bridal robe embroidery personalization */
export type PersonalizationFontAr =
  | "classic_ar"
  | "diwani"
  | "naskh"
  | "signature_ar"
  | "kufi"
  | "el_messiri"
  | "cairo"
  | "lateef"
  | "elegant_script"
  | "modern_script"
  | "luxury_serif"
  | "classic_serif"
  | "parisienne"
  | "dancing_script"
  | "cinzel"
  | "pinyon"
  | "frank_ruhl"
  | "heebo"
  | "rubik";

export type PersonalizationFontEn =
  | "elegant_script"
  | "modern_script"
  | "luxury_serif"
  | "classic_serif";

export interface ProductPersonalization {
  product_type: "veils" | "robes";
  dress_id: string;
  dress_name_ar: string;
  writing_language: "ar" | "en" | "both";
  text_ar: string;
  text_en: string;
  /** Primary storefront font (Arabic / Latin / Hebrew samples). */
  font_ar: PersonalizationFontAr;
  /** Kept for older EN-only flows; still validated on save. */
  font_en: PersonalizationFontEn;
  color:
    | "gold"
    | "silver"
    | "white"
    | "black"
    | "champagne"
    | "rose_gold";
  position:
    | "back"
    | "chest"
    | "sleeve"
    | "bottom_corner"
    | "center"
    | "custom";
}

/** Optional premium gift wrapping for veils / bridal robes */
export interface GiftOptions {
  enabled: true;
  gift_box: "standard" | "luxury_box" | "luxury_ribbon";
  gift_card: boolean;
  gift_message: string;
  sender_name: string;
  recipient_name: string;
  hide_price: boolean;
}
