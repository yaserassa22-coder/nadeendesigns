/**
 * Localized payment method labels for storefront checkout.
 * DB may only have Arabic; resolve known provider ids so HE/EN UIs stay correct.
 */

import type { Locale } from "@/lib/i18n/types";
import { pickLocalized } from "@/lib/cms/locale-text";

type LocalizedTriple = { ar: string; he: string; en: string };

const PAYMENT_NAME: Record<string, LocalizedTriple> = {
  cod: {
    ar: "الدفع عند الاستلام",
    he: "תשלום במסירה",
    en: "Cash on Delivery",
  },
  credit_card: {
    ar: "بطاقة ائتمان",
    he: "כרטיס אשראי",
    en: "Credit Card",
  },
  bit: { ar: "Bit", he: "ביט", en: "Bit" },
  stripe: { ar: "سترايب", he: "Stripe", en: "Stripe" },
  paypal: { ar: "باي بال", he: "PayPal", en: "PayPal" },
  tranzila: { ar: "ترانزيلا", he: "Tranzila", en: "Tranzila" },
  bank_transfer: {
    ar: "تحويل بنكي",
    he: "העברה בנקאית",
    en: "Bank Transfer",
  },
  apple_pay: { ar: "Apple Pay", he: "Apple Pay", en: "Apple Pay" },
  google_pay: { ar: "Google Pay", he: "Google Pay", en: "Google Pay" },
};

const PAYMENT_DESCRIPTION: Record<string, LocalizedTriple> = {
  cod: {
    ar: "ادفعي عند استلام طلبكِ من البوتيك أو مع المندوب",
    he: "שלמי בעת קבלת ההזמנה מהבוטיק או עם השליח",
    en: "Pay when you receive your order from the boutique or with the courier",
  },
  credit_card: {
    ar: "الدفع ببطاقة ائتمان أو بطاقة بنكية",
    he: "תשלום בכרטיס אשראי או כרטיס בנקאי",
    en: "Pay by credit or debit card",
  },
  bit: {
    ar: "الدفع عبر Bit",
    he: "תשלום באמצעות ביט",
    en: "Pay with Bit",
  },
  stripe: {
    ar: "بطاقات عبر سترايب",
    he: "כרטיסים דרך Stripe",
    en: "Cards via Stripe",
  },
  paypal: {
    ar: "باي بال",
    he: "PayPal",
    en: "PayPal checkout",
  },
  tranzila: {
    ar: "بوابة ترانزيلا",
    he: "שער תשלומים Tranzila",
    en: "Israeli payment gateway",
  },
  bank_transfer: {
    ar: "تحويل بنكي يدوي",
    he: "העברה בנקאית ידנית",
    en: "Manual bank transfer",
  },
  apple_pay: {
    ar: "Apple Pay",
    he: "Apple Pay",
    en: "Apple Pay",
  },
  google_pay: {
    ar: "Google Pay",
    he: "Google Pay",
    en: "Google Pay",
  },
};

export type PaymentMethodLabelSource = {
  id: string;
  name?: string | null;
  name_ar?: string | null;
  name_he?: string | null;
  name_en?: string | null;
  description?: string | null;
  description_ar?: string | null;
  description_he?: string | null;
  description_en?: string | null;
};

export function resolvePaymentMethodName(
  method: PaymentMethodLabelSource,
  locale: Locale
): string {
  const known = PAYMENT_NAME[method.id];
  return pickLocalized(
    method.name_ar || known?.ar,
    method.name_en || method.name || known?.en,
    known?.en || method.name_ar || method.id,
    locale,
    method.name_he || known?.he
  );
}

export function resolvePaymentMethodDescription(
  method: PaymentMethodLabelSource,
  locale: Locale
): string {
  const known = PAYMENT_DESCRIPTION[method.id];
  const ar = method.description_ar || known?.ar || "";
  const he = method.description_he || known?.he || "";
  const en = method.description_en || method.description || known?.en || "";
  if (!ar && !he && !en) return "";
  return pickLocalized(ar, en, ar || en || he, locale, he);
}
