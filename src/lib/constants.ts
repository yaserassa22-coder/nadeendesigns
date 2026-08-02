import type { SiteSettings } from "@/types";

export const SITE_NAME = "Nadeen Designs";

export const NAV_LINKS = [
  { href: "/", label: "الرئيسية" },
  { href: "/wedding-dresses", label: "فساتين الزفاف" },
  { href: "/rental-dresses", label: "فساتين للإيجار" },
  { href: "/veils", label: "الطرحات" },
  { href: "/robes", label: "الأرواب" },
  { href: "/gallery", label: "معرض الصور" },
  { href: "/booking", label: "احجزي موعدًا" },
  { href: "/about", label: "من نحن" },
  { href: "/contact", label: "اتصل بنا" },
] as const;

export const DRESS_STYLES = [
  "أميرة",
  "مermaid",
  "بوهو",
  "كلاسيكي",
  "حديث",
  "فintage",
] as const;

export const DRESS_COLORS = [
  "أبيض",
  "عاجي",
  "شampagne",
  "Blush",
  "ذهبي",
] as const;

export const DRESS_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export const DEFAULT_SETTINGS: SiteSettings = {
  phone: "+966500000000",
  whatsapp: "966500000000",
  email: "hello@nadeendesigns.com",
  address_ar: "الرياض، المملكة العربية السعودية",
  instagram_url: "https://instagram.com/nadeendesigns",
  instagram_handle: "@nadeendesigns",
  working_hours_ar: "السبت - الخميس: 10:00 ص - 9:00 م",
  about_ar:
    "Nadeen Designs هي بوتيك فاخر متخصص في فساتين الزفاف والإكسسوارات، حيث نجمع بين الأناقة الكلاسيكية والتصاميم العصرية لنمنح كل عروس إطلالة لا تُنسى.",
  hero_title_ar: "لأنك تستحقين أجمل إطلالة",
  hero_subtitle_ar:
    "اكتشفي مجموعة فساتين الزفاف الفاخرة المصممة لتجعل يومك أكثر أناقة وتميزًا.",
};

export const WHATSAPP_MESSAGE =
  "مرحبًا، أود الاستفسار عن خدمات Nadeen Designs";
