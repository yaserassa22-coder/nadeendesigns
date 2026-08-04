"use client";

import { useEffect, useState, startTransition } from "react";
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
import { useCustomerAuth } from "@/components/auth/CustomerAuthProvider";
import { Button } from "@/components/ui/Button";
import { featuredImage } from "@/lib/products/featured-image";
import { formatDate, formatPrice } from "@/lib/utils";
import {
  DELIVERY_METHOD_LABELS,
  getOrderStatusLabel,
  type ShopOrder,
  type ShopOrderStatus,
} from "@/types/shop";

const ORDER_CACHE_KEY = "nadeen_last_order";
const JUST_PLACED_KEY = "nadeen_order_just_placed";
const ACCENT = "#C9A14A";

function normalizeStatus(status: ShopOrderStatus): ShopOrderStatus {
  return status === "completed" ? "delivered" : status;
}

function readCachedOrder(id: string): ShopOrder | null {
  try {
    const raw = sessionStorage.getItem(ORDER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ShopOrder;
    return parsed.id === id ? parsed : null;
  } catch {
    return null;
  }
}

function readJustPlacedFlag(id: string): boolean {
  try {
    return sessionStorage.getItem(JUST_PLACED_KEY) === id;
  } catch {
    return false;
  }
}

function clearJustPlacedFlag(id: string) {
  try {
    if (sessionStorage.getItem(JUST_PLACED_KEY) === id) {
      sessionStorage.removeItem(JUST_PLACED_KEY);
    }
  } catch {
    /* ignore */
  }
}

export default function CustomerOrderPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { user, customer, openLogin } = useCustomerAuth();
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [error, setError] = useState("");
  const [refreshWarning, setRefreshWarning] = useState("");
  const [justPlaced, setJustPlaced] = useState(false);
  const [linkPromptDismissed, setLinkPromptDismissed] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const isLoggedIn = Boolean(user || customer);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    const placedNow = readJustPlacedFlag(id);
    const cached = readCachedOrder(id);

    // Defer sync sessionStorage hydration to avoid cascading render lint.
    startTransition(() => {
      if (placedNow) setJustPlaced(true);
      if (cached) {
        setOrder(cached);
        if (placedNow) setLoading(false);
      }
    });

    // Show checkout payload immediately after place-order, but keep loading
    // until the server responds when there is no local copy yet.

    const loadFromServer = async () => {
      try {
        const res = await fetch(`/api/orders/${id}`);
        let data: ShopOrder & { error?: string } = { error: "الطلب غير موجود" } as ShopOrder & {
          error?: string;
        };
        try {
          data = await res.json();
        } catch {
          throw new Error("تعذّر قراءة رد الخادم");
        }
        if (!res.ok) {
          throw new Error(data.error || "الطلب غير موجود");
        }
        if (cancelled) return;
        setOrder(data);
        setError("");
        setRefreshWarning("");
        try {
          sessionStorage.setItem(ORDER_CACHE_KEY, JSON.stringify(data));
        } catch {
          /* ignore */
        }
        // Clear only after a successful server load so React Strict Mode
        // remounts still see the just-placed flag.
        if (placedNow) clearJustPlacedFlag(id);
      } catch (e) {
        if (cancelled) return;
        if (!cached) {
          setError(e instanceof Error ? e.message : "تعذّر تحميل الطلب");
        } else if (!placedNow) {
          // Stale cache from a prior visit — warn only when refresh truly fails.
          setRefreshWarning(
            "تعذّر تحديث حالة الطلب من الخادم. تُعرض آخر نسخة محفوظة."
          );
        }
        // After successful checkout we already have the create response in
        // cache — do not scare the customer with a refresh warning.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadFromServer();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) {
    return (
      <>
        <PageHero title="الطلب غير موجود" description="معرّف الطلب غير صالح" />
        <section className="py-16 text-center">
          <Link href="/">
            <Button>العودة للرئيسية</Button>
          </Link>
        </section>
      </>
    );
  }

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
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl space-y-6 px-4 md:px-8">
          {justPlaced && (
            <div
              className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800"
              role="status"
            >
              <p className="font-semibold">تم استلام طلبكِ بنجاح</p>
              <p className="mt-1">
                شكرًا لكِ. سنوافيكِ بالتحديثات عبر الإشعارات والبريد عند التأكيد.
              </p>
            </div>
          )}
          {justPlaced && !isLoggedIn && !linkPromptDismissed && (
            <div
              className="rounded-2xl border p-5 text-sm text-charcoal"
              style={{
                borderColor: `${ACCENT}55`,
                background: `${ACCENT}10`,
              }}
            >
              <p className="font-semibold">
                أنشئي حساباً لربط هذا الطلب وتتبعه بسهولة
              </p>
              <p className="mt-1 text-muted">
                عند التسجيل بنفس رقم الهاتف أو البريد، نربط طلباتكِ السابقة
                بحسابكِ تلقائياً متى أمكن.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  style={{ backgroundColor: ACCENT }}
                  onClick={() =>
                    openLogin({
                      redirect: "/account/orders",
                      message:
                        "أنشئي حساباً لربط طلبكِ وتتبع الشحن من لوحة حسابكِ.",
                    })
                  }
                >
                  إنشاء حساب
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLinkPromptDismissed(true)}
                >
                  لاحقاً
                </Button>
              </div>
            </div>
          )}
          {refreshWarning && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
              {refreshWarning}
            </p>
          )}
          <div className="rounded-2xl border border-beige-dark bg-white p-6">
            <h2 className="text-lg font-semibold text-charcoal">حالة الشحن / الطلب</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <dt className="text-muted">رقم الطلب:</dt>
                <dd className="font-medium" dir="ltr">
                  {orderNo}
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <dt className="text-muted">الاسم:</dt>
                <dd>{order.shipping_full_name || order.name}</dd>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <dt className="text-muted">حالة الطلب:</dt>
                <dd>
                  <span className="inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-sm">
                    {getOrderStatusLabel(status, order.delivery_method)}
                  </span>
                </dd>
              </div>
              {order.delivery_method && (
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <dt className="text-muted">طريقة الاستلام:</dt>
                  <dd>{DELIVERY_METHOD_LABELS[order.delivery_method]}</dd>
                </div>
              )}
              <div className="flex flex-wrap items-baseline gap-x-2">
                <dt className="text-muted">حالة الشحن:</dt>
                <dd>{getOrderStatusLabel(status, order.delivery_method)}</dd>
              </div>
              {order.carrier_code && (
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <dt className="text-muted">شركة الشحن:</dt>
                  <dd dir="ltr">{order.carrier_code}</dd>
                </div>
              )}
              {order.tracking_number && (
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <dt className="text-muted">رقم التتبع:</dt>
                  <dd dir="ltr">
                    {order.tracking_url ? (
                      <a
                        href={order.tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gold underline"
                      >
                        {order.tracking_number}
                      </a>
                    ) : (
                      order.tracking_number
                    )}
                  </dd>
                </div>
              )}
              {(order.estimated_delivery || ship.estimated_delivery) && (
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <dt className="text-muted">مدة التوصيل المتوقعة:</dt>
                  <dd>
                    {order.estimated_delivery || ship.estimated_delivery}
                  </dd>
                </div>
              )}
            </dl>
            {order.delivery_method === "pickup" &&
              status === "ready_for_pickup" && (
                <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  طلبك جاهز للاستلام من البوتيك.
                </p>
              )}
            {order.delivery_method === "delivery" && status === "shipped" && (
              <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                تم تجهيز طلبك وسيتم شحنه.
              </p>
            )}
            {order.delivery_method === "pickup" &&
              status !== "ready_for_pickup" &&
              status !== "delivered" && (
                <p className="mt-3 text-sm text-muted">
                  يمكنك استلام طلبك من البوتيك بعد إشعارك بجاهزية الطلب.
                </p>
              )}
            <p className="mt-3 text-xs text-muted">
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
                          alt={item.name_ar}
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

          {(order.delivery_method === "delivery" ||
            order.delivery_method === "pickup" ||
            order.shipping_required ||
            ship.address) && (
            <div className="rounded-2xl border border-beige-dark bg-white p-6">
              <ShippingDetailsBlock
                title={
                  order.delivery_method === "pickup"
                    ? "الاستلام من البوتيك"
                    : "عنوان الشحن"
                }
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
                    {order.delivery_method === "delivery" ||
                    order.shipping_required
                      ? order.shipping_fee_pending
                        ? "قيد المراجعة"
                        : shippingCost > 0
                          ? formatPrice(shippingCost)
                          : "مجاني"
                      : order.delivery_method === "pickup"
                        ? "مجاني"
                        : "—"}
                  </span>
                </div>
                {order.shipping_fee_pending && (
                  <p className="text-xs text-amber-800">
                    سيتم تحديد رسوم التوصيل بعد مراجعة المنطقة.
                  </p>
                )}
                <div className="flex justify-between gap-3 border-t border-beige-dark pt-2 text-base font-semibold">
                  <span>
                    {order.shipping_fee_pending
                      ? "إجمالي المنتجات"
                      : "إجمالي الطلب"}
                  </span>
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
