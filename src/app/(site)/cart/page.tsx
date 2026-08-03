"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { PageHero } from "@/components/dresses/DressCatalog";
import { PersonalizationSummary } from "@/components/dresses/PersonalizationSummary";
import { GiftOptionsSummary } from "@/components/dresses/GiftOptionsSummary";
import { useCart } from "@/components/shop/CartProvider";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const hidePrice = items.some((i) => i.gift_options?.hide_price);

  return (
    <>
      <PageHero
        title="السلة"
        description="راجعي منتجاتكِ وتفاصيل التخصيص قبل إتمام الطلب."
      />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          {items.length === 0 ? (
            <div className="rounded-3xl border border-beige-dark bg-white p-10 text-center">
              <p className="text-muted">سلتكِ فارغة حاليًا</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/veils">
                  <Button>تسوّقي طرحة العروس</Button>
                </Link>
                <Link href="/robes">
                  <Button variant="outline">تسوّقي برنس العروس</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map((item) => (
                <div
                  key={item.line_id}
                  className="rounded-3xl border border-beige-dark bg-white p-5 md:p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-2xl bg-beige">
                      {item.image && (
                        <Image
                          src={item.image}
                          alt={item.name_ar}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-charcoal">
                            {item.name_ar}
                          </h3>
                          <p className="text-sm text-muted">
                            {item.product_type === "veil"
                              ? "طرحة"
                              : "برنس العروس"}
                          </p>
                        </div>
                        {!hidePrice && (
                          <p className="text-lg text-gold" dir="ltr">
                            {formatPrice(item.unit_price * item.quantity)}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <label className="text-sm text-muted">الكمية</label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(
                              item.line_id,
                              Number(e.target.value) || 1
                            )
                          }
                          className="w-20 rounded-xl border border-beige-dark px-3 py-2"
                          dir="ltr"
                        />
                        <button
                          type="button"
                          onClick={() => removeItem(item.line_id)}
                          className="inline-flex items-center gap-1 text-sm text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                          حذف
                        </button>
                      </div>

                      {item.personalization && (
                        <PersonalizationSummary
                          personalization={item.personalization}
                          compact
                          title="تخصيص الكتابة"
                        />
                      )}
                      {item.gift_options && (
                        <GiftOptionsSummary giftOptions={item.gift_options} />
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div className="rounded-3xl border border-gold/25 bg-beige/40 p-6">
                {!hidePrice && (
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-muted">المجموع</span>
                    <span className="text-2xl text-gold" dir="ltr">
                      {formatPrice(subtotal)}
                    </span>
                  </div>
                )}
                {hidePrice && (
                  <p className="mb-4 text-sm text-muted">
                    تم إخفاء الأسعار بناءً على خيار الهدية.
                  </p>
                )}
                <Link href="/checkout">
                  <Button size="lg" className="w-full sm:w-auto">
                    إتمام الطلب
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
