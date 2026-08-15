/**
 * Carrier / shipping-company display names (AR · HE · EN).
 * DB stores carrier_code; UI/print shows localized labels.
 */

import type { Locale } from "@/lib/i18n/types";

type CarrierTri = { ar: string; he: string; en: string };

const CARRIERS: Record<string, CarrierTri> = {
  self: { ar: "توصيل المتجر", he: "משלוח החנות", en: "Store delivery" },
  boutique: { ar: "استلام من البوتيك", he: "איסוף מהבוטיק", en: "Boutique pickup" },
  pickup: { ar: "استلام من البوتيك", he: "איסוף מהבוטיק", en: "Boutique pickup" },
  haat: { ar: "هات (HAAT)", he: "HAAT", en: "HAAT" },
  bringy: { ar: "برينجي", he: "Bringy", en: "Bringy" },
  hfd: { ar: "HFD", he: "HFD", en: "HFD" },
  cheetah: { ar: "تشيتا (Cheetah)", he: "צ'יטה", en: "Cheetah" },
  sosna: { ar: "سوسنا", he: "סוסנה", en: "Sosna" },
  zigzag: { ar: "زيغزاغ", he: "זיגזג", en: "Zigzag" },
  israel_post: {
    ar: "بريد إسرائيل",
    he: "דואר ישראל",
    en: "Israel Post",
  },
  "israel-post": {
    ar: "بريد إسرائيل",
    he: "דואר ישראל",
    en: "Israel Post",
  },
  boxit: { ar: "بوكست (نقاط استلام)", he: "בוקסיט", en: "Boxit" },
  gett: { ar: "جيت (Gett)", he: "Gett", en: "Gett Delivery" },
  yango: { ar: "يانغو", he: "Yango", en: "Yango Delivery" },
  aramex: { ar: "أرامكس", he: "Aramex", en: "Aramex" },
  dhl: { ar: "DHL", he: "DHL", en: "DHL Express" },
  fedex: { ar: "فيديكس", he: "FedEx", en: "FedEx" },
  ups: { ar: "UPS", he: "UPS", en: "UPS" },
  other: { ar: "شركة شحن أخرى", he: "חברת שילוח אחרת", en: "Other courier" },
};

function normalizeCarrierKey(code: string): string {
  return code.trim().toLowerCase().replace(/\s+/g, "_");
}

export function resolveCarrierLabel(
  code: string | null | undefined,
  locale: Locale
): string {
  const raw = (code ?? "").trim();
  if (!raw) return "";
  const key = normalizeCarrierKey(raw);
  const entry = CARRIERS[key];
  if (!entry) return raw;
  return entry[locale] || entry.ar;
}

export function resolveCarrierLabelTrilingual(
  code: string | null | undefined
): string {
  const raw = (code ?? "").trim();
  if (!raw) return "";
  const key = normalizeCarrierKey(raw);
  const entry = CARRIERS[key];
  if (!entry) return raw;
  return [entry.ar, entry.he, entry.en]
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(" · ");
}
