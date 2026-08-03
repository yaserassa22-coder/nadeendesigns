import type { SiteSettings } from "@/types";
import {
  DRESS_CATEGORY_HREFS,
  DRESS_CATEGORY_LABELS,
  DRESS_CATEGORIES,
  SHOP_NAV_LINKS,
} from "@/types";

export const SITE_NAME = "Nadeen Designs";

/** Official Instagram — use for every public Instagram link */
export const OFFICIAL_INSTAGRAM_URL =
  "https://www.instagram.com/nadeendesign_/";
export const OFFICIAL_INSTAGRAM_HANDLE = "@nadeendesign_";

export const CATEGORY_NAV_LINKS = [
  ...DRESS_CATEGORIES.map((category) => ({
    href: DRESS_CATEGORY_HREFS[category],
    label: DRESS_CATEGORY_LABELS[category],
  })),
  ...SHOP_NAV_LINKS,
];

export const NAV_LINKS = [
  { href: "/", label: "الرئيسية" },
  ...CATEGORY_NAV_LINKS,
  { href: "/cart", label: "السلة" },
  { href: "/gallery", label: "معرض الصور" },
  { href: "/booking", label: "احجزي موعدًا" },
  { href: "/about", label: "من نحن" },
  { href: "/contact", label: "اتصل بنا" },
] as const;

export const DRESS_STYLES = [
  "كلاسيكي",
  "عصري",
  "ملكي",
  "فاخر",
  "ناعم",
  "بسيط",
  "أميري",
  "حورية البحر",
  "قصة A (قصة حرف A)",
  "منفوش",
  "مستقيم",
  "بوهيمي",
  "محتشم",
  "مطرز",
  "دانتيل فاخر",
  "ساتان فاخر",
  "تول فاخر",
  "تصميم مخصص",
] as const;

/** Map legacy English / old Arabic style values to the current Arabic options */
export const STYLE_LEGACY_MAP: Record<string, (typeof DRESS_STYLES)[number]> = {
  "Classic Luxury": "ملكي",
  classic: "كلاسيكي",
  Classic: "كلاسيكي",
  modern: "عصري",
  Modern: "عصري",
  "حديث": "عصري",
  royal: "ملكي",
  Royal: "ملكي",
  luxury: "فاخر",
  Luxury: "فاخر",
  soft: "ناعم",
  Soft: "ناعم",
  simple: "بسيط",
  Simple: "بسيط",
  "أميرة": "أميري",
  princess: "أميري",
  Princess: "أميري",
  mermaid: "حورية البحر",
  Mermaid: "حورية البحر",
  "مermaid": "حورية البحر",
  "A-Line": "قصة A (قصة حرف A)",
  "A Line": "قصة A (قصة حرف A)",
  "a-line": "قصة A (قصة حرف A)",
  ballgown: "منفوش",
  Ballgown: "منفوش",
  sheath: "مستقيم",
  Sheath: "مستقيم",
  "بوهو": "بوهيمي",
  boho: "بوهيمي",
  Boho: "بوهيمي",
  Bohemian: "بوهيمي",
  "فintage": "كلاسيكي",
  vintage: "كلاسيكي",
  Vintage: "كلاسيكي",
  lace: "دانتيل فاخر",
  Lace: "دانتيل فاخر",
  satin: "ساتان فاخر",
  Satin: "ساتان فاخر",
  tulle: "تول فاخر",
  Tulle: "تول فاخر",
  custom: "تصميم مخصص",
  Custom: "تصميم مخصص",
};

export const DRESS_COLORS = [
  "أبيض",
  "أوف وايت",
  "عاجي",
  "كريمي",
  "بيج",
  "شامبين",
  "ذهبي",
  "فضي",
  "وردي فاتح",
  "وردي",
  "موف",
  "بنفسجي",
  "أزرق سماوي",
  "أزرق ملكي",
  "كحلي",
  "أخضر زمردي",
  "أخضر زيتوني",
  "أحمر",
  "خمري",
  "بني",
  "أسود",
  "رمادي",
] as const;

/** Map legacy English / mixed color values to the current Arabic options */
export const COLOR_LEGACY_MAP: Record<string, (typeof DRESS_COLORS)[number]> = {
  "Off White": "أوف وايت",
  "off white": "أوف وايت",
  "off-white": "أوف وايت",
  OffWhite: "أوف وايت",
  white: "أبيض",
  White: "أبيض",
  ivory: "عاجي",
  Ivory: "عاجي",
  cream: "كريمي",
  Cream: "كريمي",
  beige: "بيج",
  Beige: "بيج",
  champagne: "شامبين",
  Champagne: "شامبين",
  "شampagne": "شامبين",
  gold: "ذهبي",
  Gold: "ذهبي",
  golden: "ذهبي",
  silver: "فضي",
  Silver: "فضي",
  blush: "وردي فاتح",
  Blush: "وردي فاتح",
  pink: "وردي",
  Pink: "وردي",
  mauve: "موف",
  Mauve: "موف",
  purple: "بنفسجي",
  Purple: "بنفسجي",
  "sky blue": "أزرق سماوي",
  "royal blue": "أزرق ملكي",
  navy: "كحلي",
  Navy: "كحلي",
  emerald: "أخضر زمردي",
  olive: "أخضر زيتوني",
  red: "أحمر",
  Red: "أحمر",
  burgundy: "خمري",
  Burgundy: "خمري",
  brown: "بني",
  Brown: "بني",
  black: "أسود",
  Black: "أسود",
  gray: "رمادي",
  grey: "رمادي",
  Gray: "رمادي",
  Grey: "رمادي",
};

export const DRESS_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "مخصص"] as const;

export const DEFAULT_SETTINGS: SiteSettings = {
  phone: "+966500000000",
  whatsapp: "966500000000",
  email: "hello@nadeendesigns.com",
  address_ar: "الرياض، المملكة العربية السعودية",
  instagram_url: OFFICIAL_INSTAGRAM_URL,
  instagram_handle: OFFICIAL_INSTAGRAM_HANDLE,
  working_hours_ar: "السبت - الخميس: 10:00 ص - 9:00 م",
  about_ar:
    "Nadeen Designs هي بوتيك فاخر متخصص في فساتين الزفاف والإكسسوارات، حيث نجمع بين الأناقة الكلاسيكية والتصاميم العصرية لنمنح كل عروس إطلالة لا تُنسى.",
  hero_title_ar: "تفاصيل تصنع الفرق",
  hero_subtitle_ar:
    "فساتين زفاف فاخرة، تصاميم حصرية، وخدمة راقية لتكوني الأجمل في يومك المميز.",
  shipping_enabled: true,
  shipping_flat_fee: 0,
  shipping_free_threshold: 0,
};

export const WHATSAPP_MESSAGE =
  "مرحبًا، أود الاستفسار عن خدمات Nadeen Designs";

/** sessionStorage key for custom-design questionnaire → booking notes */
export const CUSTOM_DESIGN_BRIEF_KEY = "nadeen_custom_design_brief";
/** Structured questionnaire fields for edit/restore */
export const CUSTOM_DESIGN_DATA_KEY = "nadeen_custom_design_data";
