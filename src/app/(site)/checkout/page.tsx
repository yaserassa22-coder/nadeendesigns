"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { PageHero } from "@/components/dresses/DressCatalog";
import { GiftOptionsSummary } from "@/components/dresses/GiftOptionsSummary";
import { PersonalizationSummary } from "@/components/dresses/PersonalizationSummary";
import { useCart } from "@/components/shop/CartProvider";
import {
  orderToShippingDisplay,
  ShippingDetailsBlock,
} from "@/components/shop/ShippingDetailsBlock";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { formatPrice } from "@/lib/utils";
import { featuredImage } from "@/lib/products/featured-image";
import { resolveShippingCost } from "@/lib/shop/shipping";
import { normalizeSiteSettings } from "@/lib/settings";
import type { SiteSettings } from "@/types";
import type { ShopOrder } from "@/types/shop";

type ShippingForm = {
  full_name: string;
  phone: string;
  city: string;
  region: string;
  address: string;
  postal_code: string;
  notes: string;
};

const emptyShipping = (): ShippingForm => ({
  full_name: "",
  phone: "",
  city: "",
  region: "",
  address: "",
  postal_code: "",
  notes: "",
});

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, needsShipping, clearCart } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [shipping, setShipping] = useState<ShippingForm>(emptyShipping);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [placedOrder, setPlacedOrder] = useState<ShopOrder | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setSettings(normalizeSiteSettings(data));
      })
      .catch(() => {
        if (!cancelled) setSettings(normalizeSiteSettings(null));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const shippingCost = useMemo(
    () =>
      resolveShippingCost(needsShipping, {
        shipping_enabled: settings?.shipping_enabled,
        shipping_flat_fee: settings?.shipping_flat_fee,
      }),
    [needsShipping, settings]
  );

  const orderTotal = subtotal + shippingCost;
  const hidePrice = items.some((i) => i.gift_options?.hide_price);
  const giftOptions = items.find((i) => i.gift_options)?.gift_options ?? null;

  const updateShipping = <K extends keyof ShippingForm>(
    key: K,
    value: ShippingForm[K]
  ) => setShipping((s) => ({ ...s, [key]: value }));

  const submit = async () => {
    setError("");
    if (items.length === 0) {
      setError("السلة فارغة");
      return;
    }
    if (name.trim().length < 2 || phone.trim().length < 9) {
      setError("الاسم ورقم الهاتف مطلوبان");
      return;
    }
    if (needsShipping) {
      if (shipping.full_name.trim().length < 2) {
        setError("اسم المستلم مطلوب للتوصيل");
        return;
      }
      if (shipping.phone.trim().length < 9) {
        setError("هاتف التوصيل مطلوب");
        return;
      }
      if (shipping.city.trim().length < 2) {
        setError("المدينة مطلوبة للتوصيل");
        return;
      }
      if (shipping.region.trim().length < 2) {
        setError("المنطقة مطلوبة للتوصيل");
        return;
      }
      if (shipping.address.trim().length < 5) {
        setError("العنوان التفصيلي مطلوب للتوصيل");
        return;
      }
    }

    setSaving(true);
    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      notes: notes.trim() || null,
      gift_options: giftOptions,
      total: orderTotal,
      shipping_required: needsShipping,
      shipping_cost: shippingCost,
      shipping: needsShipping
        ? {
            full_name: shipping.full_name.trim(),
            phone: shipping.phone.trim(),
            city: shipping.city.trim(),
            region: shipping.region.trim(),
            address: shipping.address.trim(),
            postal_code: shipping.postal_code.trim() || null,
            notes: shipping.notes.trim() || null,
          }
        : null,
      items: items.map((i) => ({
        product_type: i.product_type,
        product_id: i.product_id,
        name_ar: i.name_ar,
        unit_price: Number(i.unit_price),
        quantity: Number(i.quantity),
        image: i.image,
        personalization: i.personalization,
        requires_shipping: i.requires_shipping,
      })),
    };

    try {
      console.info("[checkout] submitting order", {
        items: payload.items.length,
        total: payload.total,
        needsShipping,
        shippingCost,
        hasGift: Boolean(payload.gift_options),
      });

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: { error?: string; success?: boolean; order?: ShopOrder } = {};
      try {
        data = await res.json();
      } catch {
        throw new Error("تعذّر قراءة رد الخادم بعد إرسال الطلب.");
      }

      if (!res.ok) {
        console.error("[checkout] order failed", {
          status: res.status,
          data,
        });
        throw new Error(
          data.error ||
            `فشل إرسال الطلب (رمز ${res.status}). راجعي اتصال قاعدة البيانات.`
        );
      }

      console.info("[checkout] order success", data);
      setPlacedOrder(data.order ?? null);
      clearCart();
    } catch (e) {
      console.error("[checkout] unexpected error", e);
      setError(
        e instanceof Error
          ? e.message
          : "فشل تأكيد الطلب. تحققي من اتصال الإنترنت وحاولي مرة أخرى."
      );
    } finally {
      setSaving(false);
    }
  };

  if (placedOrder) {
    const ship = orderToShippingDisplay(placedOrder);
    const hidePlacedPrice = Boolean(placedOrder.gift_options?.hide_price);
    return (
      <>
        <PageHero
          title="تم استلام طلبكِ"
          description="شكرًا لتسوقكِ من Nadeen Designs"
        />
        <section className="py-16">
          <div className="mx-auto max-w-xl space-y-6 px-4 text-center">
            <CheckCircle className="mx-auto h-14 w-14 text-gold" />
            <p className="text-muted">سنتواصل معكِ قريبًا لتأكيد التفاصيل.</p>
            <div className="rounded-2xl border border-beige-dark bg-white p-6 text-start">
              <h2 className="text-lg font-semibold text-charcoal">ملخص الطلب</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {placedOrder.items.map((item, idx) => (
                  <li
                    key={`${item.product_id}-${idx}`}
                    className="flex justify-between gap-3"
                  >
                    <span>
                      {item.name_ar} × {item.quantity}
                    </span>
                    {!hidePlacedPrice && (
                      <span className="text-gold" dir="ltr">
                        {formatPrice(item.unit_price * item.quantity)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {!hidePlacedPrice && (
                <p className="mt-4 border-t border-beige-dark pt-3 text-sm">
                  المجموع:{" "}
                  <span className="text-gold" dir="ltr">
                    {formatPrice(placedOrder.total)}
                  </span>
                </p>
              )}
              <ShippingDetailsBlock
                className="mt-4 border-t border-beige-dark pt-4"
                shipping={ship}
              />
            </div>
            <Button className="mt-4" onClick={() => router.push("/")}>
              العودة للرئيسية
            </Button>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHero
        title="إتمام الطلب"
        description="أدخلي بياناتكِ لتأكيد طلب اكسسوارات العروس."
      />
      <section className="py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 md:px-8 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            <h2 className="text-xl font-semibold">ملخص الطلب</h2>
            {items.length === 0 ? (
              <div className="rounded-2xl border border-beige-dark p-6 text-sm text-muted">
                السلة فارغة.{" "}
                <Link href="/cart" className="text-gold underline">
                  العودة للسلة
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => {
                  const thumb = featuredImage(
                    item.image ? [item.image] : undefined
                  );
                  return (
                    <div
                      key={item.line_id}
                      className="flex gap-3 rounded-2xl border border-beige-dark bg-white p-4 text-sm"
                    >
                      <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-beige">
                        {thumb && (
                          <Image
                            src={thumb}
                            alt={item.name_ar}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{item.name_ar}</p>
                        <p className="text-muted">الكمية: {item.quantity}</p>
                        {!hidePrice && (
                          <p className="mt-1 text-gold" dir="ltr">
                            {formatPrice(item.unit_price * item.quantity)}
                          </p>
                        )}
                        {item.personalization && (
                          <div className="mt-3">
                            <PersonalizationSummary
                              personalization={item.personalization}
                              compact
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <GiftOptionsSummary giftOptions={giftOptions} />
                {!hidePrice && (
                  <div className="space-y-1 text-sm">
                    <p>
                      المجموع الفرعي:{" "}
                      <span className="text-gold" dir="ltr">
                        {formatPrice(subtotal)}
                      </span>
                    </p>
                    {needsShipping && shippingCost > 0 && (
                      <p>
                        الشحن:{" "}
                        <span className="text-gold" dir="ltr">
                          {formatPrice(shippingCost)}
                        </span>
                      </p>
                    )}
                    <p className="text-lg font-semibold">
                      الإجمالي:{" "}
                      <span className="text-gold" dir="ltr">
                        {formatPrice(orderTotal)}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-3xl border border-beige-dark bg-white p-6 lg:col-span-3">
            <h2 className="text-lg font-semibold text-charcoal">بيانات التواصل</h2>
            <Input
              label="الاسم الكامل *"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="رقم الهاتف *"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
            />
            <Input
              label="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
            />
            <Textarea
              label="ملاحظات عامة"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            {needsShipping && (
              <div className="space-y-4 border-t border-beige-dark pt-6">
                <div>
                  <h2 className="text-lg font-semibold text-charcoal">
                    عنوان التوصيل
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    مطلوب لطلب اكسسوارات العروس (طرحة العروس، برنص العروس، وأي
                    اكسسوارات مستقبلية).
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="اسم المستلم *"
                    value={shipping.full_name}
                    onChange={(e) => updateShipping("full_name", e.target.value)}
                  />
                  <Input
                    label="هاتف التوصيل *"
                    value={shipping.phone}
                    onChange={(e) => updateShipping("phone", e.target.value)}
                    dir="ltr"
                  />
                  <Input
                    label="المدينة *"
                    value={shipping.city}
                    onChange={(e) => updateShipping("city", e.target.value)}
                  />
                  <Input
                    label="المنطقة *"
                    value={shipping.region}
                    onChange={(e) => updateShipping("region", e.target.value)}
                  />
                  <div className="sm:col-span-2">
                    <Textarea
                      label="العنوان التفصيلي *"
                      rows={3}
                      value={shipping.address}
                      onChange={(e) => updateShipping("address", e.target.value)}
                    />
                  </div>
                  <Input
                    label="الرمز البريدي (اختياري)"
                    value={shipping.postal_code}
                    onChange={(e) =>
                      updateShipping("postal_code", e.target.value)
                    }
                    dir="ltr"
                  />
                  <div className="sm:col-span-2">
                    <Textarea
                      label="ملاحظات التوصيل (اختياري)"
                      rows={2}
                      value={shipping.notes}
                      onChange={(e) => updateShipping("notes", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                {error}
              </p>
            )}
            <Button
              size="lg"
              loading={saving}
              disabled={items.length === 0}
              onClick={submit}
            >
              تأكيد الطلب
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
