"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SITE_NAME } from "@/lib/constants";
import { formatDate, formatPrice } from "@/lib/utils";
import {
  DELIVERY_METHOD_LABELS,
  getOrderStatusLabel,
  type ShopOrder,
  type ShopOrderStatus,
} from "@/types/shop";

function orderNumber(id: string) {
  return `ND-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export default function ShippingSlipPrintPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch(`/api/orders/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "الطلب غير موجود");
        if (!cancelled) setOrder(data);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "تعذر التحميل");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (order) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [order]);

  if (loading) {
    return (
      <div className="p-10 text-center text-muted print:hidden">جاري التحميل…</div>
    );
  }

  if (!order) {
    return (
      <div className="p-10 text-center text-red-600 print:hidden">
        {error || "الطلب غير موجود"}
      </div>
    );
  }

  const status = (
    order.status === "completed" ? "delivered" : order.status
  ) as ShopOrderStatus;
  const method = order.delivery_method;
  const region =
    order.shipping_region_name_ar ||
    order.shipping_region_custom ||
    order.shipping_region ||
    "—";
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(order.id)}`;

  return (
    <div className="shipping-slip mx-auto max-w-[210mm] bg-white p-8 text-charcoal" dir="rtl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-xl bg-gold px-4 py-2 text-sm font-medium text-white"
        >
          طباعة بيانات الشحن
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded-xl border border-beige-dark px-4 py-2 text-sm"
        >
          إغلاق
        </button>
      </div>

      <header className="flex items-center justify-between border-b border-beige-dark pb-4">
        <div>
          <p className="font-[family-name:var(--font-cormorant)] text-2xl tracking-widest text-gold">
            {SITE_NAME}
          </p>
          <p className="text-xs text-muted">بيانات الشحن / الاستلام</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt={SITE_NAME} className="h-12 w-auto" />
      </header>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section>
          <h2 className="text-sm font-semibold text-gold">معلومات الطلب</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div>
              <dt className="inline text-muted">رقم الطلب: </dt>
              <dd className="inline font-medium" dir="ltr">
                {orderNumber(order.id)}
              </dd>
            </div>
            <div>
              <dt className="inline text-muted">التاريخ: </dt>
              <dd className="inline">{formatDate(order.created_at)}</dd>
            </div>
            <div>
              <dt className="inline text-muted">الحالة: </dt>
              <dd className="inline">
                {getOrderStatusLabel(status, method)}
              </dd>
            </div>
            <div>
              <dt className="inline text-muted">طريقة الاستلام: </dt>
              <dd className="inline">
                {method
                  ? DELIVERY_METHOD_LABELS[method]
                  : order.shipping_required
                    ? "توصيل"
                    : "—"}
              </dd>
            </div>
            {order.tracking_number && (
              <div>
                <dt className="inline text-muted">رقم التتبع: </dt>
                <dd className="inline font-medium" dir="ltr">
                  {order.tracking_number}
                </dd>
              </div>
            )}
            {order.carrier_code && (
              <div>
                <dt className="inline text-muted">شركة الشحن: </dt>
                <dd className="inline" dir="ltr">
                  {order.carrier_code}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gold">العميلة</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div>
              <dt className="inline text-muted">الاسم: </dt>
              <dd className="inline">
                {order.shipping_full_name || order.name}
              </dd>
            </div>
            <div>
              <dt className="inline text-muted">الهاتف: </dt>
              <dd className="inline" dir="ltr">
                {order.shipping_phone || order.phone}
              </dd>
            </div>
          </dl>
          <div className="mt-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="QR" width={96} height={96} className="rounded" />
          </div>
        </section>
      </div>

      {method === "pickup" ? (
        <section className="mt-6 rounded-xl border border-beige-dark p-4 text-sm">
          <h2 className="font-semibold text-gold">استلام من البوتيك</h2>
          <p className="mt-2 text-muted">
            سيتم إشعار العميلة عند جاهزية الطلب للاستلام من البوتيك.
          </p>
        </section>
      ) : (
        <section className="mt-6 rounded-xl border border-beige-dark p-4 text-sm">
          <h2 className="font-semibold text-gold">عنوان التوصيل</h2>
          <dl className="mt-2 space-y-1">
            <div>
              <dt className="inline text-muted">المنطقة: </dt>
              <dd className="inline">
                {region}
                {order.region_configured === false || order.shipping_fee_pending
                  ? " (غير مُعدّة)"
                  : ""}
              </dd>
            </div>
            {order.shipping_city && (
              <div>
                <dt className="inline text-muted">المدينة: </dt>
                <dd className="inline">{order.shipping_city}</dd>
              </div>
            )}
            {order.shipping_neighborhood && (
              <div>
                <dt className="inline text-muted">الحي: </dt>
                <dd className="inline">{order.shipping_neighborhood}</dd>
              </div>
            )}
            {order.shipping_building_number && (
              <div>
                <dt className="inline text-muted">رقم المبنى: </dt>
                <dd className="inline">{order.shipping_building_number}</dd>
              </div>
            )}
            {order.shipping_address && (
              <div>
                <dt className="inline text-muted">العنوان: </dt>
                <dd className="inline whitespace-pre-wrap">
                  {order.shipping_address}
                </dd>
              </div>
            )}
            {order.shipping_postal_code && (
              <div>
                <dt className="inline text-muted">الرمز البريدي: </dt>
                <dd className="inline" dir="ltr">
                  {order.shipping_postal_code}
                </dd>
              </div>
            )}
            {order.shipping_notes && (
              <div>
                <dt className="inline text-muted">ملاحظات التوصيل: </dt>
                <dd className="inline whitespace-pre-wrap">
                  {order.shipping_notes}
                </dd>
              </div>
            )}
            {order.internal_shipping_notes && (
              <div>
                <dt className="inline text-muted">ملاحظات داخلية: </dt>
                <dd className="inline whitespace-pre-wrap">
                  {order.internal_shipping_notes}
                </dd>
              </div>
            )}
            {order.notes && (
              <div>
                <dt className="inline text-muted">ملاحظات العميلة: </dt>
                <dd className="inline whitespace-pre-wrap">{order.notes}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-gold">المنتجات</h2>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b border-beige-dark text-muted">
              <th className="py-2 text-right font-medium">المنتج</th>
              <th className="py-2 text-right font-medium">الكمية</th>
              <th className="py-2 text-right font-medium">السعر</th>
            </tr>
          </thead>
          <tbody>
            {(order.items ?? []).map((item, idx) => (
              <tr key={idx} className="border-b border-beige-dark/50">
                <td className="py-2">{item.name_ar}</td>
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
            <dt className="text-muted">رسوم الشحن</dt>
            <dd dir="ltr">
              {order.shipping_fee_pending
                ? "قيد المراجعة"
                : Number(order.shipping_cost ?? 0) > 0
                  ? formatPrice(Number(order.shipping_cost))
                  : "مجاني"}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-beige-dark pt-2 text-base font-semibold">
            <dt>{order.shipping_fee_pending ? "إجمالي المنتجات" : "الإجمالي"}</dt>
            <dd className="text-gold" dir="ltr">
              {formatPrice(Number(order.total))}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
