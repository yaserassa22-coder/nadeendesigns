"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { PageHero } from "@/components/dresses/DressCatalog";
import { GiftOptionsSummary } from "@/components/dresses/GiftOptionsSummary";
import { PersonalizationSummary } from "@/components/dresses/PersonalizationSummary";
import { useCart } from "@/components/shop/CartProvider";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { formatPrice } from "@/lib/utils";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const hidePrice = items.some((i) => i.gift_options?.hide_price);
  const giftOptions = items.find((i) => i.gift_options)?.gift_options ?? null;

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

    setSaving(true);
    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      notes: notes.trim() || null,
      gift_options: giftOptions,
      total: subtotal,
      items: items.map((i) => ({
        product_type: i.product_type,
        product_id: i.product_id,
        name_ar: i.name_ar,
        unit_price: Number(i.unit_price),
        quantity: Number(i.quantity),
        image: i.image,
        personalization: i.personalization,
      })),
    };

    try {
      console.info("[checkout] submitting order", {
        items: payload.items.length,
        total: payload.total,
        hasGift: Boolean(payload.gift_options),
      });

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: { error?: string; success?: boolean; order?: unknown } = {};
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
      clearCart();
      setSuccess(true);
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

  if (success) {
    return (
      <>
        <PageHero title="تم استلام طلبكِ" description="شكرًا لتسوقكِ من Nadeen Designs" />
        <section className="py-16">
          <div className="mx-auto max-w-xl px-4 text-center">
            <CheckCircle className="mx-auto h-14 w-14 text-gold" />
            <p className="mt-4 text-muted">سنتواصل معكِ قريبًا لتأكيد التفاصيل.</p>
            <Button className="mt-8" onClick={() => router.push("/")}>
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
        description="أدخلي بياناتكِ لتأكيد طلب الطرحات أو برنص العروس."
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
                {items.map((item) => (
                  <div
                    key={item.line_id}
                    className="rounded-2xl border border-beige-dark bg-white p-4 text-sm"
                  >
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
                ))}
                <GiftOptionsSummary giftOptions={giftOptions} />
                {!hidePrice && (
                  <p className="text-lg">
                    المجموع:{" "}
                    <span className="text-gold" dir="ltr">
                      {formatPrice(subtotal)}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-3xl border border-beige-dark bg-white p-6 lg:col-span-3">
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
              label="ملاحظات"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
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
