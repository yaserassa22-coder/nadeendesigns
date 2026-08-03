"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHero } from "@/components/dresses/DressCatalog";
import { GiftOptionsSummary } from "@/components/dresses/GiftOptionsSummary";
import { PersonalizationSummary } from "@/components/dresses/PersonalizationSummary";
import { useCart } from "@/components/shop/CartProvider";
import {
  RegionAutocomplete,
  type RegionSelection,
} from "@/components/shop/RegionAutocomplete";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import {
  NotificationPreferences,
  validateNotificationPreferences,
  type NotificationPreferenceValue,
} from "@/components/forms/NotificationPreferences";
import { formatPrice } from "@/lib/utils";
import { featuredImage } from "@/lib/products/featured-image";
import {
  defaultDeliveryMethod,
  formatEstimatedDelivery,
  isFreeShippingEligible,
  resolveShippingCost,
  type DeliveryMethod,
} from "@/lib/shop/shipping";
import { normalizeSiteSettings } from "@/lib/settings";
import type { SiteSettings } from "@/types";
import type { ShippingRegion, ShopOrder } from "@/types/shop";

type ShippingForm = {
  full_name: string;
  phone: string;
  city: string;
  region: string;
  address: string;
  building_number: string;
  neighborhood: string;
  postal_code: string;
  notes: string;
  shipping_region_id: string;
};

const emptyShipping = (): ShippingForm => ({
  full_name: "",
  phone: "",
  city: "",
  region: "",
  address: "",
  building_number: "",
  neighborhood: "",
  postal_code: "",
  notes: "",
  shipping_region_id: "",
});

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, needsShipping, clearCart } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [shipping, setShipping] = useState<ShippingForm>(emptyShipping);
  const [regionSel, setRegionSel] = useState<RegionSelection>({
    regionId: null,
    regionText: "",
    matched: null,
  });
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod | null>(
    null
  );
  const [regions, setRegions] = useState<ShippingRegion[]>([]);
  const [notifyPrefs, setNotifyPrefs] = useState<NotificationPreferenceValue>({
    notify_whatsapp: true,
    notify_email: true,
  });
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/shipping-regions").then((r) => r.json()),
    ])
      .then(([settingsData, regionsData]) => {
        if (cancelled) return;
        const normalized = normalizeSiteSettings(settingsData);
        setSettings(normalized);
        const list = Array.isArray(regionsData) ? regionsData : [];
        setRegions(list);
        setDeliveryMethod(defaultDeliveryMethod(normalized));
      })
      .catch(() => {
        if (!cancelled) {
          const normalized = normalizeSiteSettings(null);
          setSettings(normalized);
          setDeliveryMethod(defaultDeliveryMethod(normalized));
        }
      })
      .finally(() => {
        if (!cancelled) setSettingsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pickupEnabled = settings?.boutique_pickup_enabled !== false;
  const deliveryEnabled = settings?.delivery_enabled !== false;

  const selectedRegion = regionSel.matched;
  const feePending =
    deliveryMethod === "delivery" &&
    regionSel.regionText.trim().length >= 2 &&
    !selectedRegion &&
    !regionSel.regionId;

  const shippingSettings = useMemo(
    () => ({
      shipping_enabled: settings?.shipping_enabled,
      shipping_flat_fee: settings?.shipping_flat_fee,
      shipping_free_threshold: settings?.shipping_free_threshold,
      boutique_pickup_enabled: settings?.boutique_pickup_enabled,
      delivery_enabled: settings?.delivery_enabled,
    }),
    [settings]
  );

  const shippingCost = useMemo(
    () =>
      settingsLoaded && !feePending
        ? resolveShippingCost(needsShipping, subtotal, shippingSettings, {
            deliveryMethod,
            regionFee: selectedRegion
              ? Number(selectedRegion.shipping_fee)
              : null,
          })
        : 0,
    [
      needsShipping,
      subtotal,
      shippingSettings,
      settingsLoaded,
      deliveryMethod,
      selectedRegion,
      feePending,
    ]
  );

  const freeShipping = useMemo(
    () =>
      settingsLoaded &&
      !feePending &&
      isFreeShippingEligible(needsShipping, subtotal, shippingSettings, {
        deliveryMethod,
        regionFee: selectedRegion
          ? Number(selectedRegion.shipping_fee)
          : null,
      }),
    [
      needsShipping,
      subtotal,
      shippingSettings,
      settingsLoaded,
      deliveryMethod,
      selectedRegion,
      feePending,
    ]
  );

  const orderTotal = subtotal + shippingCost;
  const hidePrice = items.some((i) => i.gift_options?.hide_price);
  const giftOptions = items.find((i) => i.gift_options)?.gift_options ?? null;
  const estimatedLabel = formatEstimatedDelivery(selectedRegion);

  const updateShipping = <K extends keyof ShippingForm>(
    key: K,
    value: ShippingForm[K]
  ) => setShipping((s) => ({ ...s, [key]: value }));

  const onRegionChange = (next: RegionSelection) => {
    setRegionSel(next);
    setShipping((s) => ({
      ...s,
      shipping_region_id: next.regionId ?? "",
      region: next.regionText,
      city: s.city || next.matched?.name_ar || s.city,
    }));
  };

  const submit = async () => {
    setError("");
    if (items.length === 0) {
      setError("السلة فارغة");
      return;
    }
    if (!settingsLoaded) {
      setError("جاري تحميل إعدادات الشحن… انتظري لحظة ثم حاولي مرة أخرى.");
      return;
    }
    if (name.trim().length < 2 || phone.trim().length < 9) {
      setError("الاسم ورقم الهاتف مطلوبان");
      return;
    }
    const notifyError = validateNotificationPreferences(notifyPrefs, {
      phone,
      email,
    });
    if (notifyError) {
      setError(notifyError);
      return;
    }
    if (needsShipping) {
      if (!deliveryMethod) {
        setError("يرجى اختيار طريقة استلام الطلب");
        return;
      }
      if (deliveryMethod === "pickup" && !pickupEnabled) {
        setError("الاستلام من البوتيك غير متاح حالياً");
        return;
      }
      if (deliveryMethod === "delivery" && !deliveryEnabled) {
        setError("التوصيل غير متاح حالياً");
        return;
      }
      if (deliveryMethod === "delivery") {
        if (shipping.full_name.trim().length < 2) {
          setError("اسم المستلم مطلوب للتوصيل");
          return;
        }
        if (shipping.phone.trim().length < 9) {
          setError("هاتف التوصيل مطلوب");
          return;
        }
        if (regionSel.regionText.trim().length < 2) {
          setError("المنطقة / المدينة مطلوبة للتوصيل");
          return;
        }
        if (shipping.city.trim().length < 2) {
          setError("المدينة مطلوبة للتوصيل");
          return;
        }
        if (shipping.address.trim().length < 5) {
          setError("العنوان التفصيلي مطلوب للتوصيل");
          return;
        }
      }
    }

    setSaving(true);
    const regionText = regionSel.regionText.trim();
    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      notes: notes.trim() || null,
      gift_options: giftOptions,
      total: orderTotal,
      notify_whatsapp: notifyPrefs.notify_whatsapp,
      notify_email: notifyPrefs.notify_email,
      shipping_required: needsShipping,
      delivery_method: needsShipping ? deliveryMethod : null,
      shipping_cost: shippingCost,
      shipping:
        needsShipping && deliveryMethod === "delivery"
          ? {
              full_name: shipping.full_name.trim(),
              phone: shipping.phone.trim(),
              city: shipping.city.trim(),
              region: regionText,
              address: shipping.address.trim(),
              building_number: shipping.building_number.trim() || null,
              neighborhood: shipping.neighborhood.trim() || null,
              postal_code: shipping.postal_code.trim() || null,
              notes: shipping.notes.trim() || null,
              shipping_region_id: regionSel.regionId || null,
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
        throw new Error(
          data.error ||
            `فشل إرسال الطلب (رمز ${res.status}). راجعي اتصال قاعدة البيانات.`
        );
      }

      if (data.order?.id) {
        clearCart();
        try {
          sessionStorage.setItem(
            "nadeen_last_order",
            JSON.stringify(data.order)
          );
          sessionStorage.setItem("nadeen_order_just_placed", data.order.id);
        } catch {
          /* ignore */
        }
        router.push(`/orders/${data.order.id}`);
      } else {
        setError("تم إنشاء الطلب لكن تعذّر فتح صفحة التأكيد.");
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "فشل تأكيد الطلب. تحققي من اتصال الإنترنت وحاولي مرة أخرى."
      );
    } finally {
      setSaving(false);
    }
  };

  const shippingFeeLabel = !settingsLoaded
    ? "…"
    : !needsShipping
      ? "—"
      : deliveryMethod === "pickup"
        ? "مجاني"
        : feePending
          ? "قيد المراجعة"
          : freeShipping || shippingCost === 0
            ? settings?.shipping_enabled === false
              ? "معطّل"
              : "مجاني"
            : formatPrice(shippingCost);

  return (
    <>
      <PageHero
        title="إتمام الطلب"
        description="أدخلي بياناتكِ لتأكيد الطلب."
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
                <div className="space-y-2 rounded-2xl border border-beige-dark bg-beige/20 p-4 text-sm">
                  {!hidePrice && (
                    <div className="flex justify-between gap-3">
                      <span>مجموع المنتجات</span>
                      <span className="text-gold" dir="ltr">
                        {formatPrice(subtotal)}
                      </span>
                    </div>
                  )}
                  {hidePrice && (
                    <p className="text-xs text-muted">
                      تم إخفاء أسعار المنتجات بناءً على خيار الهدية.
                    </p>
                  )}
                  <div className="flex justify-between gap-3">
                    <span>رسوم الشحن</span>
                    <span className="text-gold" dir="ltr">
                      {shippingFeeLabel}
                    </span>
                  </div>
                  {feePending && (
                    <p className="text-xs text-amber-800">
                      سيتم تحديد رسوم التوصيل بعد مراجعة المنطقة.
                    </p>
                  )}
                  {needsShipping &&
                    deliveryMethod === "delivery" &&
                    !feePending &&
                    freeShipping &&
                    (settings?.shipping_free_threshold ?? 0) > 0 && (
                      <p className="text-xs text-muted">
                        تم تطبيق الشحن المجاني (حد{" "}
                        <span dir="ltr">
                          {formatPrice(settings?.shipping_free_threshold ?? 0)}
                        </span>
                        )
                      </p>
                    )}
                  {estimatedLabel && !feePending && (
                    <p className="text-xs text-muted">
                      مدة التوصيل المتوقعة: {estimatedLabel}
                    </p>
                  )}
                  {!hidePrice && (
                    <div className="flex justify-between gap-3 border-t border-beige-dark pt-2 text-base font-semibold">
                      <span>
                        {feePending ? "إجمالي المنتجات" : "الإجمالي"}
                      </span>
                      <span className="text-gold" dir="ltr">
                        {!settingsLoaded ? "…" : formatPrice(orderTotal)}
                      </span>
                    </div>
                  )}
                  {feePending && !hidePrice && (
                    <p className="text-xs text-muted">
                      الإجمالي النهائي يُحدَّث بعد تحديد رسوم الشحن من الإدارة.
                    </p>
                  )}
                  {hidePrice && needsShipping && shippingCost > 0 && (
                    <p className="text-xs text-muted">
                      رسوم الشحن تُحتسب عند تأكيد الطلب حتى مع إخفاء أسعار المنتجات.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <form
            className="space-y-4 rounded-3xl border border-beige-dark bg-white p-6 lg:col-span-3"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <h2 className="text-lg font-semibold text-charcoal">بيانات التواصل</h2>
            <Input
              label="الاسم الكامل *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
            <Input
              label="رقم الهاتف *"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
              autoComplete="tel"
            />
            <Input
              label="البريد الإلكتروني"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              autoComplete="email"
            />
            <Textarea
              label="ملاحظات عامة"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="border-t border-beige-dark pt-6">
              <NotificationPreferences
                idPrefix="checkout-notify"
                value={notifyPrefs}
                onChange={setNotifyPrefs}
              />
            </div>

            {needsShipping && (
              <div className="space-y-4 border-t border-beige-dark pt-6">
                <div>
                  <h2 className="text-lg font-semibold text-charcoal">
                    طريقة استلام الطلب
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    مطلوب لطلب اكسسوارات العروس (طرحة العروس، برنص العروس، وأي
                    اكسسوارات مستقبلية).
                  </p>
                </div>

                {!pickupEnabled && !deliveryEnabled ? (
                  <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    الاستلام والتوصيل غير متاحين حالياً. تواصلي مع البوتيك.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pickupEnabled && (
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-beige-dark px-4 py-3 text-sm has-[:checked]:border-gold has-[:checked]:bg-gold/5">
                        <input
                          type="radio"
                          name="delivery_method"
                          checked={deliveryMethod === "pickup"}
                          onChange={() => setDeliveryMethod("pickup")}
                          className="mt-0.5 accent-gold"
                        />
                        <span>
                          <span className="font-medium text-charcoal">
                            الاستلام من البوتيك (مجاناً)
                          </span>
                        </span>
                      </label>
                    )}
                    {deliveryEnabled && (
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-beige-dark px-4 py-3 text-sm has-[:checked]:border-gold has-[:checked]:bg-gold/5">
                        <input
                          type="radio"
                          name="delivery_method"
                          checked={deliveryMethod === "delivery"}
                          onChange={() => {
                            setDeliveryMethod("delivery");
                            setShipping((s) => ({
                              ...s,
                              full_name: s.full_name || name,
                              phone: s.phone || phone,
                            }));
                          }}
                          className="mt-0.5 accent-gold"
                        />
                        <span className="font-medium text-charcoal">التوصيل</span>
                      </label>
                    )}
                  </div>
                )}

                {deliveryMethod === "pickup" && pickupEnabled && (
                  <p className="rounded-xl border border-beige-dark bg-beige/30 px-4 py-3 text-sm text-charcoal/80">
                    سيتم إشعارك عند جاهزية طلبك للاستلام من البوتيك.
                  </p>
                )}

                {deliveryMethod === "delivery" && deliveryEnabled && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <RegionAutocomplete
                        regions={regions}
                        value={regionSel}
                        onChange={onRegionChange}
                      />
                    </div>
                    <Input
                      label="اسم المستلم *"
                      value={shipping.full_name}
                      onChange={(e) =>
                        updateShipping("full_name", e.target.value)
                      }
                      autoComplete="shipping name"
                    />
                    <Input
                      label="هاتف التوصيل *"
                      value={shipping.phone}
                      onChange={(e) => updateShipping("phone", e.target.value)}
                      dir="ltr"
                      autoComplete="shipping tel"
                    />
                    <Input
                      label="المدينة *"
                      value={shipping.city}
                      onChange={(e) => updateShipping("city", e.target.value)}
                      autoComplete="shipping address-level2"
                    />
                    <Input
                      label="الحي"
                      value={shipping.neighborhood}
                      onChange={(e) =>
                        updateShipping("neighborhood", e.target.value)
                      }
                    />
                    <Input
                      label="رقم المبنى"
                      value={shipping.building_number}
                      onChange={(e) =>
                        updateShipping("building_number", e.target.value)
                      }
                    />
                    <Input
                      label="الرمز البريدي (اختياري)"
                      value={shipping.postal_code}
                      onChange={(e) =>
                        updateShipping("postal_code", e.target.value)
                      }
                      dir="ltr"
                      autoComplete="shipping postal-code"
                    />
                    <div className="sm:col-span-2">
                      <Textarea
                        label="العنوان التفصيلي *"
                        rows={3}
                        value={shipping.address}
                        onChange={(e) =>
                          updateShipping("address", e.target.value)
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Textarea
                        label="ملاحظات التوصيل (اختياري)"
                        rows={2}
                        value={shipping.notes}
                        onChange={(e) => updateShipping("notes", e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              loading={saving}
              disabled={
                items.length === 0 ||
                !settingsLoaded ||
                (needsShipping && !pickupEnabled && !deliveryEnabled)
              }
            >
              تأكيد الطلب
            </Button>
          </form>
        </div>
      </section>
    </>
  );
}
