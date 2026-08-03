"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHero } from "@/components/dresses/DressCatalog";
import { GiftOptionsSummary } from "@/components/dresses/GiftOptionsSummary";
import { PersonalizationSummary } from "@/components/dresses/PersonalizationSummary";
import {
  orderToShippingDisplay,
  ShippingDetailsBlock,
} from "@/components/shop/ShippingDetailsBlock";
import { Button } from "@/components/ui/Button";
import { featuredImage } from "@/lib/products/featured-image";
import { formatDate, formatPrice } from "@/lib/utils";
import {
  SHOP_ORDER_STATUS_LABELS,
  type ShopOrder,
  type ShopOrderStatus,
} from "@/types/shop";

const ORDER_CACHE_KEY = "nadeen_last_order";

function normalizeStatus(status: ShopOrderStatus): ShopOrderStatus {
  return status === "completed" ? "delivered" : status;
}

export default function CustomerOrderPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setError("معرّف الطلب غير صالح");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fromCache = () => {
      try {
        const raw = sessionStorage.getItem(ORDER_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as ShopOrder;
        return parsed.id === id ? parsed : null;
      } catch {
        return null;
      }
    };

    const cached = fromCache();
    if (cached) {
      setOrder(cached);
      setLoading(false);
    }

    fetch(`/api/orders/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "الطلب غير موجود");
        return data as ShopOrder;
      })
      .then((data) => {
        if (cancelled) return;
        setOrder(data);
        try {
          sessionStorage.setItem(ORDER_CACHE_KEY, JSON.stringify(data));
        } catch {
          /* ignore */
        }
      })
      .catch((e) => {
        if (cancelled) return;
        if (!cached) {
          setError(e instanceof Error ? e.message : "تعذّر تحميل الطلب");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <>
        <PageHero title="تفاصيل طلبكِ" description="جاري التحميل…" />
        <section className="py-16 text-center text-muted">جاري التحميل…</section>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <PageHero title="الطلب غير موجود" description={error || "تعذّر العثور على الطلب"} />
        <section className="py-16 text-center">
          <Link href="/">
            <Button>العودة للرئيسية</Button>
          </Link>
        </section>
      </>
    );
  }

  const status = normalizeStatus(order.status);
  const ship = orderToShippingDisplay(order);
  const hidePrice = Boolean(order.gift_options?.hide_price);
  const itemsSubtotal = (order.items ?? []).reduce(
    (sum, i) => sum + Number(i.unit_price) * Number(i.quantity),
    0
  );
  const shippingCost = Number(order.shipping_cost ?? 0);
  const orderNo = `ND-${order.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

  return (
    <>
      <PageHero title="تفاصيل طلبكِ" description={`رقم الطلب ${orderNo}`} />
      <section className="py-12 md:py-20">
        <div className="mx-auto max-w-3xl space-y-6 px-4 md:px-8">
          <div className="rounded-2xl border border-beige-dark bg-white p-6">
            <h2 className="text-lg font-semibold text-charcoal">حالة الشحن / الطلب</h2>
            <p className="mt-2 inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-sm">
              {SHOP_ORDER_STATUS_LABELS[status]}
            </p>
            <p className="mt-2 text-xs text-muted">
              تاريخ الطلب: {formatDate(order.created_at)}
            </p>
          </div>

          <div className="rounded-2xl border border-beige-dark bg-white p-6">
            <h2 className="text-lg font-semibold text-charcoal">المنتجات</h2>
            <ul className="mt-4 space-y-3">
              {(order.items ?? []).map((item, idx) => {
                const thumb = featuredImage(
                  item.image ? [item.image] : undefined
                );
                return (
                  <li
                    key={`${item.product_id}-${idx}`}
                    className="flex gap-3 border-b border-beige-dark/60 pb-3 last:border-0"
                  >
                    <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-beige">
                      {thumb && (
                        <Image
                          src={thumb}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {item.name_ar} × {item.quantity}
                      </p>
                      {!hidePrice && (
                        <p className="text-sm text-gold" dir="ltr">
                          {formatPrice(item.unit_price * item.quantity)}
                        </p>
                      )}
                      {item.personalization && (
                        <div className="mt-2">
                          <PersonalizationSummary
                            personalization={item.personalization}
                            compact
                          />
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <GiftOptionsSummary giftOptions={order.gift_options} />
          </div>

          {(order.shipping_required || ship.address) && (
            <div className="rounded-2xl border border-beige-dark bg-white p-6">
              <ShippingDetailsBlock
                title="عنوان الشحن"
                shipping={ship}
                showZeroCost
              />
            </div>
          )}

          {!hidePrice && (
            <div className="rounded-2xl border border-beige-dark bg-beige/20 p-6 text-sm">
              <h2 className="text-lg font-semibold text-charcoal">الدفع</h2>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between gap-3">
                  <span>مجموع المنتجات</span>
                  <span dir="ltr">{formatPrice(itemsSubtotal)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>رسوم الشحن</span>
                  <span dir="ltr">
                    {order.shipping_required
                      ? shippingCost > 0
                        ? formatPrice(shippingCost)
                        : "مجاني"
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-3 border-t border-beige-dark pt-2 text-base font-semibold">
                  <span>إجمالي الطلب</span>
                  <span className="text-gold" dir="ltr">
                    {formatPrice(Number(order.total))}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Link href="/">
              <Button>العودة للرئيسية</Button>
            </Link>
            <Link href="/veils">
              <Button variant="outline">متابعة التسوق</Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
