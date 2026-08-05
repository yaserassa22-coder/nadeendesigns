"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHero } from "@/components/dresses/DressCatalog";
import { GiftOptionsSummary } from "@/components/dresses/GiftOptionsSummary";
import { PersonalizationSummary } from "@/components/dresses/PersonalizationSummary";
import { OrderOptionsSummary } from "@/components/product/OrderOptionsSummary";
import { ExtraServicesSummary } from "@/components/product/ExtraServicesSummary";
import { useCart } from "@/components/shop/CartProvider";
import {
  RegionAutocomplete,
  type RegionSelection,
} from "@/components/shop/RegionAutocomplete";
import { useCustomerAuth } from "@/components/auth/CustomerAuthProvider";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import {
  NotificationPreferences,
  validateNotificationPreferences,
  type NotificationPreferenceValue,
} from "@/components/forms/NotificationPreferences";
import {
  isValidCheckoutPhone,
  isValidPersonName,
  normalizePersonName,
} from "@/lib/phone";
import { formatPrice } from "@/lib/utils";
import { featuredImage } from "@/lib/products/featured-image";
import { ProductPrice } from "@/components/product/ProductPrice";
import { cartLineDisplayPrices } from "@/lib/products/pricing";
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
  const {
    user,
    customer,
    guestMode,
    settings: authSettings,
    openLogin,
    continueAsGuest,
  } = useCustomerAuth();
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
  const [paymentMethods, setPaymentMethods] = useState<
    { id: string; name_ar: string; description_ar: string }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const isLoggedIn = Boolean(user || customer);
  const guestCheckoutEnabled = authSettings?.guest_checkout_enabled !== false;

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/shipping-regions").then((r) => r.json()),
      fetch("/api/store-settings").then((r) => r.json()).catch(() => null),
    ])
      .then(([settingsData, regionsData, storeData]) => {
        if (cancelled) return;
        const normalized = normalizeSiteSettings(settingsData);
        setSettings(normalized);
        const list = Array.isArray(regionsData) ? regionsData : [];
        setRegions(list);
        setDeliveryMethod(defaultDeliveryMethod(normalized));
        if (storeData?.payments && Array.isArray(storeData.payments)) {
          setPaymentMethods(storeData.payments);
        } else {
          setPaymentMethods([
            {
              id: "cod",
              name_ar: "الدفع عند الاستلام",
              description_ar: "ادفعي عند استلام طلبكِ",
            },
          ]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          const normalized = normalizeSiteSettings(null);
          setSettings(normalized);
          setDeliveryMethod(defaultDeliveryMethod(normalized));
          setPaymentMethods([
            {
              id: "cod",
              name_ar: "الدفع عند الاستلام",
              description_ar: "ادفعي عند استلام طلبكِ",
            },
          ]);
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

  const placeOrder = async () => {
    setError("");
    if (items.length === 0) {
      setError("السلة فارغة");
      return;
    }
    if (!settingsLoaded) {
      setError("جاري تحميل إعدادات الشحن… انتظري لحظة ثم حاولي مرة أخرى.");
      return;
    }
    // Contact name/phone may be empty if the customer only filled delivery
    // recipient fields — fall back to shipping values so validation matches the UI.
    const shippingName = normalizePersonName(shipping.full_name);
    const shippingPhone = shipping.phone.trim();
    const contactName =
      normalizePersonName(name) ||
      (deliveryMethod === "delivery" ? shippingName : "");
    const contactPhone =
      phone.trim() || (deliveryMethod === "delivery" ? shippingPhone : "");

    if (!isValidPersonName(contactName) || !isValidCheckoutPhone(contactPhone)) {
      setError("الاسم ورقم الهاتف مطلوبان");
      return;
    }
    const notifyError = validateNotificationPreferences(notifyPrefs, {
      phone: contactPhone,
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
        const recipientName = shippingName || contactName;
        const recipientPhone = shippingPhone || contactPhone;
        if (!isValidPersonName(recipientName)) {
          setError("اسم المستلم مطلوب للتوصيل");
          return;
        }
        if (!isValidCheckoutPhone(recipientPhone)) {
          setError("هاتف التوصيل مطلوب");
          return;
        }
        if (regionSel.regionText.trim().length < 2) {
          setError("المنطقة / المدينة مطلوبة للتوصيل");
          return;
        }
        if (shipping.city.trim().length < 2) {
          setError("البلدة / المدينة مطلوبة للتوصيل");
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
    const recipientName =
      shippingName || (deliveryMethod === "delivery" ? contactName : "");
    const recipientPhone =
      shippingPhone || (deliveryMethod === "delivery" ? contactPhone : "");
    const payload = {
      name: contactName,
      phone: contactPhone,
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
              full_name: recipientName,
              phone: recipientPhone,
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
        gift_options: i.gift_options,
        order_options: i.order_options,
        extra_services: i.extra_services,
        personalization_fee: i.personalization_fee ?? null,
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

  const submit = async () => {
    setError("");
    // Soft auth prompt only after basic contact fields look ready
    if (!isLoggedIn) {
      if (!guestCheckoutEnabled) {
        openLogin({
          redirect: "/checkout",
          message: "يلزم تسجيل الدخول لإتمام الطلب حالياً.",
        });
        return;
      }
      if (!guestMode) {
        const shippingName = normalizePersonName(shipping.full_name);
        const shippingPhone = shipping.phone.trim();
        const contactName =
          normalizePersonName(name) ||
          (deliveryMethod === "delivery" ? shippingName : "");
        const contactPhone =
          phone.trim() || (deliveryMethod === "delivery" ? shippingPhone : "");
        if (
          !isValidPersonName(contactName) ||
          !isValidCheckoutPhone(contactPhone)
        ) {
          setError("الاسم ورقم الهاتف مطلوبان");
          return;
        }
        setAuthPromptOpen(true);
        return;
      }
    }
    await placeOrder();
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
                          <ProductPrice
                            className="mt-1"
                            size="sm"
                            {...cartLineDisplayPrices(item)}
                            showSaleBadge={false}
                          />
                        )}
                        {item.personalization && (
                          <div className="mt-3">
                            <PersonalizationSummary
                              personalization={item.personalization}
                              compact
                            />
                          </div>
                        )}
                        <div className="mt-3 space-y-2">
                          <OrderOptionsSummary
                            options={item.order_options}
                            compact
                          />
                          <ExtraServicesSummary
                            services={item.extra_services}
                            compact
                            hidePrice={hidePrice}
                          />
                        </div>
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
                  {(feePending ||
                    (estimatedLabel && !feePending) ||
                    (needsShipping &&
                      deliveryMethod === "delivery" &&
                      !feePending &&
                      freeShipping)) && (
                    <p className="text-xs text-muted">
                      {feePending
                        ? "رسوم التوصيل تُحدَّد بعد اختيار المنطقة."
                        : [
                            freeShipping ? "شحن مجاني" : null,
                            estimatedLabel
                              ? `التوصيل خلال ${estimatedLabel}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
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
                </div>
              </div>
            )}
          </div>

          <form
            className="space-y-4 rounded-2xl border border-beige-dark bg-white p-6 lg:col-span-3"
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
                    اختاري الاستلام من البوتيك أو التوصيل.
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
                      label="البلدة / المدينة *"
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

            {paymentMethods.length > 0 && (
              <div className="space-y-3 border-t border-beige-dark pt-6">
                <div>
                  <h2 className="text-lg font-semibold text-charcoal">
                    طريقة الدفع
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    الطرق المتاحة حالياً حسب إعدادات المتجر.
                  </p>
                </div>
                <div className="space-y-2">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className="rounded-xl border border-gold/40 bg-gold/5 px-4 py-3 text-sm"
                    >
                      <p className="font-medium text-charcoal">
                        {method.name_ar}
                      </p>
                      {method.description_ar ? (
                        <p className="mt-0.5 text-muted">
                          {method.description_ar}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
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

      {authPromptOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
          dir="rtl"
        >
          <button
            type="button"
            aria-label="إغلاق"
            className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
            onClick={() => setAuthPromptOpen(false)}
          />
          <div className="relative z-10 m-4 w-full max-w-md rounded-2xl border border-beige-dark bg-white p-6 shadow-[0_24px_80px_rgba(44,36,25,0.18)]">
            <div className="mb-4 h-1 w-full rounded-full bg-gradient-to-l from-gold via-gold/60 to-gold" />
            <h3 className="font-[family-name:var(--font-amiri)] text-xl text-charcoal">
              هل ترغبين بإنشاء حساب لحفظ طلباتك وتتبع الشحن بسهولة؟
            </h3>
            <p className="mt-2 text-sm text-muted">
              يمكنكِ المتابعة كزائرة دون تسجيل — أو إنشاء حساب لربط الطلبات.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="flex-1"
                onClick={() => {
                  setAuthPromptOpen(false);
                  openLogin({
                    redirect: "/checkout",
                    message:
                      "أنشئي حساباً لحفظ طلباتك وتتبع الشحن بسهولة.",
                  });
                }}
              >
                إنشاء حساب
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setAuthPromptOpen(false);
                  continueAsGuest();
                  void placeOrder();
                }}
              >
                المتابعة كزائرة
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
