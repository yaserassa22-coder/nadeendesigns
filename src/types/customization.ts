/** Veil / bridal robe embroidery personalization */
export interface ProductPersonalization {
  product_type: "veils" | "robes";
  dress_id: string;
  dress_name_ar: string;
  writing_language: "ar" | "en" | "both";
  text_ar: string;
  text_en: string;
  font_ar: "classic_ar" | "diwani" | "naskh" | "signature_ar";
  font_en:
    | "elegant_script"
    | "modern_script"
    | "luxury_serif"
    | "classic_serif";
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
