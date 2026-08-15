/**
 * Named couriers: Arab companies operating inside Israel (HAAT, Bringy,
 * Aramex) plus Israeli e-commerce couriers used by stores in the south.
 *
 * These are catalog entries for Admin — not live APIs. Tracking is never invented.
 * A real adapter can replace any entry later without changing orders or QR.
 */

import type { LocalizedProviderLabel } from "@/lib/commerce/types";
import { createManualAdapter } from "./manual";
import type { ShippingCarrierAdapter } from "./types";

type CatalogEntry = {
  code: string;
  label: LocalizedProviderLabel;
};

/**
 * Display order on the Admin providers page.
 * Arab companies operating inside Israel (HAAT, Bringy, Aramex) are listed first
 * after Israel Post, then the Israeli e-commerce couriers shops actually use.
 */
export const IL_MARKET_CARRIER_ORDER: string[] = [
  "israel_post",
  "haat",
  "bringy",
  "aramex",
  "hfd",
  "cheetah",
  "zigzag",
  "sosna",
  "boxit",
  "gett",
  "yango",
  "dhl",
  "fedex",
  "ups",
  "self",
];

const CATALOG: CatalogEntry[] = [
  {
    code: "haat",
    label: {
      ar: "هات (HAAT)",
      he: "HAAT",
      en: "HAAT",
    },
  },
  {
    code: "bringy",
    label: {
      ar: "برينجي",
      he: "Bringy",
      en: "Bringy",
    },
  },
  {
    code: "hfd",
    label: {
      ar: "HFD",
      he: "HFD",
      en: "HFD",
    },
  },
  {
    code: "cheetah",
    label: {
      ar: "تشيتا (Cheetah)",
      he: "צ'יטה",
      en: "Cheetah",
    },
  },
  {
    code: "aramex",
    label: {
      ar: "أرامكس",
      he: "Aramex",
      en: "Aramex",
    },
  },
  {
    code: "zigzag",
    label: {
      ar: "زيغزاغ",
      he: "זיגזג",
      en: "Zigzag",
    },
  },
  {
    code: "sosna",
    label: {
      ar: "سوسنا",
      he: "סוסנה",
      en: "Sosna",
    },
  },
  {
    code: "boxit",
    label: {
      ar: "بوكست (نقاط استلام)",
      he: "בוקסיט",
      en: "Boxit",
    },
  },
  {
    code: "gett",
    label: {
      ar: "جيت (Gett)",
      he: "Gett",
      en: "Gett Delivery",
    },
  },
  {
    code: "yango",
    label: {
      ar: "يانغو",
      he: "Yango",
      en: "Yango Delivery",
    },
  },
  {
    code: "dhl",
    label: {
      ar: "DHL",
      he: "DHL",
      en: "DHL Express",
    },
  },
  {
    code: "fedex",
    label: {
      ar: "فيديكس",
      he: "FedEx",
      en: "FedEx",
    },
  },
  {
    code: "ups",
    label: {
      ar: "UPS",
      he: "UPS",
      en: "UPS",
    },
  },
  {
    code: "self",
    label: {
      ar: "توصيل المتجر",
      he: "משלוח החנות",
      en: "Store delivery",
    },
  },
];

export const israelMarketCarrierAdapters: ShippingCarrierAdapter[] =
  CATALOG.map((entry) => createManualAdapter(entry));

export function marketCarrierSortIndex(code: string): number {
  const i = IL_MARKET_CARRIER_ORDER.indexOf(code);
  return i === -1 ? IL_MARKET_CARRIER_ORDER.length + 1 : i;
}
