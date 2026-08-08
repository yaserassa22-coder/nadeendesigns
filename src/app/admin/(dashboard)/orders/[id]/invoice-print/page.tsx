"use client";

/**
 * Hebrew printable tax invoice — admin print view.
 * Admin layout chrome is print:hidden.
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SITE_NAME } from "@/lib/constants";
import { resolveOrderLineName } from "@/lib/i18n/order-item-labels";
import {
  computeVatBreakdown,
  INVOICE_TYPE_LABELS_HE,
  orderHasInvoice,
} from "@/lib/shop/invoice";
import { formatPublicOrderNumber } from "@/lib/shop/order-tracking-qr";
import { formatDate, formatPrice } from "@/lib/utils";
import type { ShopOrder } from "@/types/shop";
import type { StoreTaxDocumentType } from "@/types/store";

type InvoiceStoreInfo = {
  store_name?: string;
  phone?: string;
  email?: string;
  business_address_he?: string;
  business_address_ar?: string;
  business_address?: string;
  tax?: {
    business_id?: string;
    business_id_type?: string;
    vat_rate?: number;
    prices_include_vat?: boolean;
  };
  vat_number?: string;
};

const BUSINESS_ID_TYPE_LABELS_HE: Record<string, string> = {
  company: "ח.פ.",
  authorized_dealer: "ע.מ.",
  exempt: "עוסק פטור",
  other: "אחר",
};

export default function InvoicePrintPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [store, setStore] = useState<InvoiceStoreInfo | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const [orderRes, settingsRes] = await Promise.all([
          fetch(`/api/orders/${id}`, { cache: "no-store" }),
          fetch("/api/store-settings", { cache: "no-store" }).catch(() => null),
        ]);
        const orderData = await orderRes.json();
        if (!orderRes.ok) {
          throw new Error(orderData.error || "ההזמנה לא נמצאה");
        }
        if (!orderHasInvoice(orderData)) {
          throw new Error("המסמך עדיין לא הונפק");
        }
        let settings: InvoiceStoreInfo | null = null;
        if (settingsRes?.ok) {
          settings = (await settingsRes.json()) as InvoiceStoreInfo;
        }
        if (!cancelled) {
          setOrder(orderData);
          setStore(settings);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "טעינה נכשלה");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (order) {
      const t = setTimeout(() => window.print(), 450);
      return () => clearTimeout(t);
    }
  }, [order]);

  if (loading) {
    return (
      <div className="p-10 text-center text-muted" dir="rtl">
        טוען חשבונית…
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-10 text-center text-red-600" dir="rtl">
        {error || "ההזמנה לא נמצאה"}
      </div>
    );
  }

  const type = (order.invoice_type ||
    "tax_invoice_receipt") as StoreTaxDocumentType;
  const typeLabel = INVOICE_TYPE_LABELS_HE[type] || "חשבונית";
  const vat = computeVatBreakdown(Number(order.total) || 0, {
    vat_rate: order.vat_rate ?? store?.tax?.vat_rate ?? 18,
    prices_include_vat:
      order.prices_include_vat ?? store?.tax?.prices_include_vat ?? true,
  });
  const businessName = store?.store_name || SITE_NAME;
  const phone = store?.phone || "";
  const email = store?.email || "";
  const address =
    store?.business_address_he ||
    store?.business_address_ar ||
    store?.business_address ||
    "";
  const rawId =
    store?.tax?.business_id?.trim() || store?.vat_number?.trim() || "";
  const idType =
    BUSINESS_ID_TYPE_LABELS_HE[store?.tax?.business_id_type || ""] || "מזהה עסק";
  const businessIdLabel = rawId ? `${idType}: ${rawId}` : `${idType}: —`;
  const displayOrder = formatPublicOrderNumber(order.id);

  return (
    <div
      className="invoice-print mx-auto min-h-screen max-w-[210mm] bg-white p-8 text-charcoal"
      dir="rtl"
      lang="he"
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-gold px-4 py-2 text-sm font-medium text-white"
          >
            הדפסה
          </button>
          <a
            href={`/api/orders/${order.id}/invoice`}
            className="rounded-xl border border-beige-dark px-4 py-2 text-sm"
          >
            הורדת PDF
          </a>
        </div>
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded-xl border border-beige-dark px-4 py-2 text-sm"
        >
          סגור
        </button>
      </div>

      <header className="border-b border-beige-dark pb-4 text-center">
        <p className="font-[family-name:var(--font-cormorant)] text-2xl tracking-widest text-gold">
          {businessName}
        </p>
        <h1 className="mt-2 text-xl font-semibold">{typeLabel}</h1>
        {address ? (
          <p className="mt-2 text-sm text-muted">{address}</p>
        ) : null}
        <p className="mt-1 text-sm text-muted" dir="ltr">
          {[phone, email].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-1 text-xs text-muted">{businessIdLabel}</p>
      </header>

      <div className="mt-6 grid gap-6 border-b border-beige-dark pb-6 text-sm sm:grid-cols-2">
        <section className="space-y-2 text-start">
          <h2 className="font-semibold text-gold">פרטי מסמך</h2>
          <dl className="space-y-1.5">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <dt className="text-muted shrink-0">מס׳ מסמך:</dt>
              <dd className="font-semibold" dir="ltr">
                {order.invoice_number}
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <dt className="text-muted shrink-0">תאריך:</dt>
              <dd dir="ltr">
                {formatDate(order.invoice_issued_at || order.created_at)}
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <dt className="text-muted shrink-0">הזמנה:</dt>
              <dd dir="ltr">{displayOrder}</dd>
            </div>
          </dl>
        </section>

        <section className="space-y-2 text-start">
          <h2 className="font-semibold text-gold">פרטי לקוחה</h2>
          <dl className="space-y-1.5">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <dt className="text-muted shrink-0">שם:</dt>
              <dd className="font-medium">{order.name}</dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <dt className="text-muted shrink-0">טלפון:</dt>
              <dd dir="ltr">{order.phone}</dd>
            </div>
            {order.email ? (
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <dt className="text-muted shrink-0">דוא״ל:</dt>
                <dd dir="ltr">{order.email}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      </div>

      <section className="mt-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-beige-dark bg-gold/10 text-muted">
              <th className="py-2 pe-2 text-start font-medium">פריט</th>
              <th className="px-2 py-2 text-center font-medium">כמות</th>
              <th className="px-2 py-2 text-end font-medium">מחיר</th>
              <th className="py-2 ps-2 text-end font-medium">סה״כ</th>
            </tr>
          </thead>
          <tbody>
            {(order.items ?? []).map((item, idx) => {
              const qty = Math.max(1, Number(item.quantity) || 1);
              const line = Number(item.unit_price) * qty;
              return (
                <tr key={idx} className="border-b border-beige-dark/50">
                  <td className="py-2 pe-2 text-start">
                    {resolveOrderLineName(item, "he")}
                  </td>
                  <td className="px-2 py-2 text-center" dir="ltr">
                    {qty}
                  </td>
                  <td className="px-2 py-2 text-end" dir="ltr">
                    {formatPrice(Number(item.unit_price) || 0)}
                  </td>
                  <td className="py-2 ps-2 text-end" dir="ltr">
                    {formatPrice(line)}
                  </td>
                </tr>
              );
            })}
            {(Number(order.shipping_cost) || 0) > 0 ? (
              <tr className="border-b border-beige-dark/50">
                <td className="py-2 pe-2 text-start">שילוח</td>
                <td className="px-2 py-2 text-center">1</td>
                <td className="px-2 py-2 text-end" dir="ltr">
                  {formatPrice(Number(order.shipping_cost))}
                </td>
                <td className="py-2 ps-2 text-end" dir="ltr">
                  {formatPrice(Number(order.shipping_cost))}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="mt-6 flex justify-start">
        <dl className="w-64 space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">סכום לפני מע״מ</dt>
            <dd dir="ltr">{formatPrice(vat.net)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">מע״מ {vat.rate}%</dt>
            <dd dir="ltr">{formatPrice(order.vat_amount ?? vat.vat)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-beige-dark pt-2 text-base font-semibold">
            <dt>סה״כ לתשלום</dt>
            <dd dir="ltr">{formatPrice(vat.gross)}</dd>
          </div>
        </dl>
      </section>

      <p className="mt-8 text-center text-xs text-muted">
        {vat.pricesIncludeVat
          ? 'המחירים כוללים מע"מ'
          : 'המחירים לפני מע"מ'}
      </p>
      <p className="mt-2 text-center text-[11px] text-muted">
        מסמך פנימי של החנות — אינו מוגש לרשות המסים דרך מערכת זו.
      </p>
    </div>
  );
}
