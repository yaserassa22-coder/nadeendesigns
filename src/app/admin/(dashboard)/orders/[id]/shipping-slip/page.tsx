"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { OrderCode128Barcode } from "@/components/admin/OrderCode128Barcode";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { SITE_NAME } from "@/lib/constants";
import { getDictionary, formatMessage } from "@/lib/i18n/dictionaries";
import {
  resolveCarrierLabel,
  resolveCarrierLabelTrilingual,
} from "@/lib/i18n/carrier-labels";
import {
  resolveOrderLineName,
  resolveOrderLineNameTrilingual,
} from "@/lib/i18n/order-item-labels";
import {
  buildShippingQrImageUrl,
  formatPublicOrderNumber,
  resolveShippingQrPayload,
} from "@/lib/shop/order-tracking-qr";
import { formatDate, formatPrice } from "@/lib/utils";
import {
  getDeliveryMethodLabel,
  getOrderStatusLabel,
  type ShopOrder,
  type ShopOrderStatus,
} from "@/types/shop";

export default function ShippingSlipPrintPage() {
  const { t, locale, dir } = useLocale();
  const ui = t.admin.shippingSlipUi;
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  /** Cache-bust so "regenerate QR" refreshes the image with the current URL. */
  const [qrNonce, setQrNonce] = useState(0);
  const [storeContact, setStoreContact] = useState<{
    phone?: string;
    email?: string;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch(`/api/orders/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || ui.notFound);
        if (!cancelled) setOrder(data);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : ui.loadFailed);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, ui.notFound, ui.loadFailed]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/store-settings")
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setStoreContact({
          phone: typeof data.phone === "string" ? data.phone : undefined,
          email: typeof data.email === "string" ? data.email : undefined,
        });
      })
      .catch(() => {
        /* optional — dictionary address/hours still shown */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (order) {
      const timer = setTimeout(() => window.print(), 400);
      return () => clearTimeout(timer);
    }
  }, [order]);

  const qrPayload = useMemo(
    () => (order ? resolveShippingQrPayload(order) : null),
    [order]
  );
  const qrImageUrl = useMemo(() => {
    if (!qrPayload?.data) return null;
    return buildShippingQrImageUrl(qrPayload.data, {
      size: 320,
      cacheBust: qrNonce || undefined,
    });
  }, [qrPayload, qrNonce]);

  const addressTri = useMemo(() => {
    const ar = getDictionary("ar").footer.addressDefault;
    const he = getDictionary("he").footer.addressDefault;
    const en = getDictionary("en").footer.addressDefault;
    return [ar, he, en].filter((v, i, a) => a.indexOf(v) === i);
  }, []);

  const hoursTri = useMemo(() => {
    const ar = getDictionary("ar").footer.hoursDefault;
    const he = getDictionary("he").footer.hoursDefault;
    const en = getDictionary("en").footer.hoursDefault;
    return [ar, he, en].filter((v, i, a) => a.indexOf(v) === i);
  }, []);

  if (loading) {
    return (
      <div className="p-10 text-center text-muted print:hidden" dir={dir}>
        {ui.loading}
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-10 text-center text-red-600 print:hidden" dir={dir}>
        {error || ui.notFound}
      </div>
    );
  }

  const status = (
    order.status === "completed" ? "delivered" : order.status
  ) as ShopOrderStatus;
  const method = order.delivery_method;
  const displayOrderNumber = formatPublicOrderNumber(order.id);
  const region =
    order.shipping_region_name_ar ||
    order.shipping_region_custom ||
    order.shipping_region ||
    ui.dash;
  const printLabel =
    method === "pickup" ? ui.printPickup : ui.printShipping;

  return (
    <div
      className="shipping-slip mx-auto max-w-[210mm] bg-white p-8 text-charcoal"
      dir={dir}
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-gold px-4 py-2 text-sm font-medium text-white"
          >
            {printLabel}
          </button>
          <button
            type="button"
            onClick={() => setQrNonce((n) => n + 1)}
            className="rounded-xl border border-beige-dark px-4 py-2 text-sm"
            title={ui.regenerateQrTitle}
          >
            {ui.regenerateQr}
          </button>
        </div>
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded-xl border border-beige-dark px-4 py-2 text-sm"
        >
          {ui.close}
        </button>
      </div>

      {process.env.NODE_ENV === "development" && qrPayload?.warning && (
        <div
          className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 print:hidden"
          role="status"
        >
          {qrPayload.warning}
        </div>
      )}

      <header className="flex items-center justify-between border-b border-beige-dark pb-4">
        <div>
          <p className="font-[family-name:var(--font-cormorant)] text-2xl tracking-widest text-gold">
            {SITE_NAME}
          </p>
          <p className="text-xs text-muted">{ui.documentTitle}</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt={SITE_NAME} className="h-12 w-auto" />
      </header>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section>
          <h2 className="text-sm font-semibold text-gold">{ui.orderInfo}</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div>
              <dt className="inline text-muted">{ui.orderNumber} </dt>
              <dd className="inline font-medium" dir="ltr">
                {displayOrderNumber}
              </dd>
            </div>
            <div>
              <dt className="inline text-muted">{ui.date} </dt>
              <dd className="inline">{formatDate(order.created_at)}</dd>
            </div>
            <div>
              <dt className="inline text-muted">{ui.status} </dt>
              <dd className="inline">
                {getOrderStatusLabel(status, method, locale)}
              </dd>
            </div>
            <div>
              <dt className="inline text-muted">{ui.deliveryMethod} </dt>
              <dd className="inline">
                {method
                  ? getDeliveryMethodLabel(method, locale)
                  : order.shipping_required
                    ? ui.deliveryFallback
                    : ui.dash}
              </dd>
            </div>
            {order.tracking_number && (
              <div>
                <dt className="inline text-muted">{ui.trackingNumber} </dt>
                <dd className="inline font-medium" dir="ltr">
                  {order.tracking_number}
                </dd>
              </div>
            )}
            {order.carrier_code && (
              <div>
                <dt className="inline text-muted">{ui.carrier} </dt>
                <dd className="inline">
                  <span>{resolveCarrierLabel(order.carrier_code, locale)}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {resolveCarrierLabelTrilingual(order.carrier_code)}
                  </span>
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section className="flex min-h-[360px] flex-col">
          <h2 className="text-sm font-semibold text-gold">{ui.customer}</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div>
              <dt className="inline text-muted">{ui.name} </dt>
              <dd className="inline">
                {order.shipping_full_name || order.name}
              </dd>
            </div>
            <div>
              <dt className="inline text-muted">{ui.phone} </dt>
              <dd className="inline" dir="ltr">
                {order.shipping_phone || order.phone}
              </dd>
            </div>
          </dl>
          {qrImageUrl ? (
            <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-2 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrImageUrl}
                alt={ui.qrAlt}
                width={320}
                height={320}
                className="h-[320px] w-[320px] max-w-full border border-charcoal bg-white p-1"
              />
              <p className="text-sm font-medium text-charcoal">
                {ui.scanToTrack}
              </p>
              <OrderCode128Barcode
                value={displayOrderNumber}
                className="h-auto w-full max-w-[280px]"
              />
              <p className="text-xs text-charcoal" dir="ltr">
                {formatMessage(ui.orderNumberLine, {
                  number: displayOrderNumber,
                })}
              </p>
              {qrPayload?.trackingUrl && (
                <p
                  className="max-w-[320px] break-all text-[10px] text-muted"
                  dir="ltr"
                >
                  {qrPayload.trackingUrl}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-red-700 print:hidden">
              {ui.qrFailed}
            </p>
          )}
        </section>
      </div>

      {method === "pickup" ? (
        <section className="mt-6 rounded-xl border border-beige-dark p-4 text-sm">
          <h2 className="font-semibold text-gold">{ui.boutiquePickup}</h2>
          <p className="mt-2 text-muted">{ui.boutiquePickupHint}</p>
        </section>
      ) : (
        <section className="mt-6 rounded-xl border border-beige-dark p-4 text-sm">
          <h2 className="font-semibold text-gold">{ui.deliveryAddress}</h2>
          <dl className="mt-2 space-y-1">
            <div>
              <dt className="inline text-muted">{ui.region} </dt>
              <dd className="inline">
                {region}
                {order.region_configured === false || order.shipping_fee_pending
                  ? ` ${ui.regionNotConfigured}`
                  : ""}
              </dd>
            </div>
            {order.shipping_city && (
              <div>
                <dt className="inline text-muted">{ui.city} </dt>
                <dd className="inline">{order.shipping_city}</dd>
              </div>
            )}
            {order.shipping_neighborhood && (
              <div>
                <dt className="inline text-muted">{ui.neighborhood} </dt>
                <dd className="inline">{order.shipping_neighborhood}</dd>
              </div>
            )}
            {order.shipping_building_number && (
              <div>
                <dt className="inline text-muted">{ui.buildingNumber} </dt>
                <dd className="inline">{order.shipping_building_number}</dd>
              </div>
            )}
            {order.shipping_address && (
              <div>
                <dt className="inline text-muted">{ui.address} </dt>
                <dd className="inline whitespace-pre-wrap">
                  {order.shipping_address}
                </dd>
              </div>
            )}
            {order.shipping_postal_code && (
              <div>
                <dt className="inline text-muted">{ui.postalCode} </dt>
                <dd className="inline" dir="ltr">
                  {order.shipping_postal_code}
                </dd>
              </div>
            )}
            {order.shipping_notes && (
              <div>
                <dt className="inline text-muted">{ui.deliveryNotes} </dt>
                <dd className="inline whitespace-pre-wrap">
                  {order.shipping_notes}
                </dd>
              </div>
            )}
            {order.internal_shipping_notes && (
              <div>
                <dt className="inline text-muted">{ui.internalNotes} </dt>
                <dd className="inline whitespace-pre-wrap">
                  {order.internal_shipping_notes}
                </dd>
              </div>
            )}
            {order.notes && (
              <div>
                <dt className="inline text-muted">{ui.customerNotes} </dt>
                <dd className="inline whitespace-pre-wrap">{order.notes}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <section className="mt-6 rounded-xl border border-beige-dark p-4 text-sm">
        <h2 className="font-semibold text-gold">{ui.storeContact}</h2>
        <dl className="mt-2 space-y-1">
          {storeContact?.phone && (
            <div>
              <dt className="inline text-muted">{ui.storePhone} </dt>
              <dd className="inline" dir="ltr">
                {storeContact.phone}
              </dd>
            </div>
          )}
          {storeContact?.email && (
            <div>
              <dt className="inline text-muted">{ui.storeEmail} </dt>
              <dd className="inline" dir="ltr">
                {storeContact.email}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-muted">{ui.storeAddress}</dt>
            <dd className="mt-0.5 space-y-0.5 text-xs text-muted">
              {addressTri.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </dd>
          </div>
          <div>
            <dt className="text-muted">{ui.storeHours}</dt>
            <dd className="mt-0.5 space-y-0.5 text-xs text-muted">
              {hoursTri.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-gold">{ui.products}</h2>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b border-beige-dark text-muted">
              <th className="py-2 text-start font-medium">{ui.productCol}</th>
              <th className="py-2 text-start font-medium">{ui.qtyCol}</th>
              <th className="py-2 text-start font-medium">{ui.priceCol}</th>
            </tr>
          </thead>
          <tbody>
            {(order.items ?? []).map((item, idx) => (
              <tr key={idx} className="border-b border-beige-dark/50">
                <td className="py-2">
                  <span className="block">
                    {resolveOrderLineName(item, locale)}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {resolveOrderLineNameTrilingual(item)}
                  </span>
                </td>
                <td className="py-2">{item.quantity}</td>
                <td className="py-2" dir="ltr">
                  {formatPrice(Number(item.unit_price) * Number(item.quantity))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-6 flex justify-end">
        <dl className="w-56 space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{ui.shippingFee}</dt>
            <dd dir="ltr">
              {order.shipping_fee_pending
                ? ui.feePending
                : Number(order.shipping_cost ?? 0) > 0
                  ? formatPrice(Number(order.shipping_cost))
                  : ui.free}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-beige-dark pt-2 text-base font-semibold">
            <dt>
              {order.shipping_fee_pending ? ui.productsTotal : ui.grandTotal}
            </dt>
            <dd className="text-gold" dir="ltr">
              {formatPrice(Number(order.total))}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
