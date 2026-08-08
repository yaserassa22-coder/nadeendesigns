/**
 * Israeli tax document helpers — VAT math, labels, sequence formatting.
 * Internal documents only (no Green Invoice / Morning / Hashavshevet API yet).
 */

import type { StoreTaxDocumentType, StoreTaxSettings } from "@/types/store";
import type { ShopOrder, ShopOrderItem } from "@/types/shop";
import { shopLineDisplayTotal } from "@/lib/products/order-experience";
import { resolveOrderLineName } from "@/lib/i18n/order-item-labels";

export const INVOICE_TYPE_LABELS_AR: Record<StoreTaxDocumentType, string> = {
  receipt: "קבלה / إيصال",
  tax_invoice: "חשבונית מס / فاتورة ضريبية",
  tax_invoice_receipt: "חשבונית מס / קבלה",
};

export const INVOICE_TYPE_LABELS_HE: Record<StoreTaxDocumentType, string> = {
  receipt: "קבלה",
  tax_invoice: "חשבונית מס",
  tax_invoice_receipt: "חשבונית מס / קבלה",
};

export const BUSINESS_ID_TYPE_LABELS_AR: Record<string, string> = {
  company: "ח.פ. / شركة",
  authorized_dealer: "ע.מ. / تاجر مرخّص",
  exempt: "עוסק פטור / معفى",
  other: "أخرى",
};

export type VatBreakdown = {
  gross: number;
  net: number;
  vat: number;
  rate: number;
  pricesIncludeVat: boolean;
};

export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Split gross/net/VAT from order total using store tax settings. */
export function computeVatBreakdown(
  total: number,
  tax: Pick<StoreTaxSettings, "vat_rate" | "prices_include_vat">
): VatBreakdown {
  const rate = Math.max(0, Number(tax.vat_rate) || 0);
  const gross = roundMoney(Math.max(0, Number(total) || 0));
  const pricesIncludeVat = tax.prices_include_vat !== false;

  if (rate <= 0) {
    return {
      gross,
      net: gross,
      vat: 0,
      rate: 0,
      pricesIncludeVat,
    };
  }

  if (pricesIncludeVat) {
    const net = roundMoney(gross / (1 + rate / 100));
    const vat = roundMoney(gross - net);
    return { gross, net, vat, rate, pricesIncludeVat };
  }

  const vat = roundMoney(gross * (rate / 100));
  return {
    gross: roundMoney(gross + vat),
    net: gross,
    vat,
    rate,
    pricesIncludeVat,
  };
}

export function formatInvoiceNumber(prefix: string, seq: number): string {
  const p = (prefix || "ND").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 16) || "ND";
  const n = Math.max(1, Math.floor(seq));
  return `${p}-${String(n).padStart(6, "0")}`;
}

export function resolveDocumentType(
  tax: StoreTaxSettings,
  _opts?: { paymentReceived?: boolean }
): StoreTaxDocumentType {
  return tax.default_document_type;
}

export type InvoiceLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export function orderInvoiceLines(items: ShopOrderItem[]): InvoiceLine[] {
  return (items ?? []).map((item) => {
    const lineTotal = shopLineDisplayTotal(item);
    const qty = Math.max(1, Number(item.quantity) || 1);
    return {
      name: resolveOrderLineName(item, "he") || item.name_ar || "מוצר",
      quantity: qty,
      unitPrice: roundMoney(lineTotal / qty),
      lineTotal: roundMoney(lineTotal),
    };
  });
}

export function orderHasInvoice(order: Pick<ShopOrder, "invoice_number">): boolean {
  return Boolean(order.invoice_number?.trim());
}

export type IssuedInvoiceMeta = {
  invoice_number: string;
  invoice_type: StoreTaxDocumentType;
  invoice_issued_at: string;
  vat_rate: number;
  vat_amount: number;
  invoice_subtotal: number;
  prices_include_vat: boolean;
};
