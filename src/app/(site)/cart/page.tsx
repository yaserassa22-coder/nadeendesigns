"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Trash2 } from "lucide-react";
import { PageHero } from "@/components/dresses/DressCatalog";
import { PersonalizationSummary } from "@/components/dresses/PersonalizationSummary";
import { GiftOptionsSummary } from "@/components/dresses/GiftOptionsSummary";
import { OrderOptionsSummary } from "@/components/product/OrderOptionsSummary";
import { ExtraServicesSummary } from "@/components/product/ExtraServicesSummary";
import { useCart } from "@/components/shop/CartProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProductPrice } from "@/components/product/ProductPrice";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { cartLineDisplayPrices } from "@/lib/products/pricing";
import { formatPrice } from "@/lib/utils";
import { resolveOrderLineName } from "@/lib/i18n/order-item-labels";

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const { t, locale } = useLocale();
  const hidePrice = items.some((i) => i.gift_options?.hide_price);

  function cartLineTypeLabel(productType: string): string {
    if (productType === "veil") return t.cart.productVeil;
    if (productType === "bridal_robe") return t.cart.productRobe;
    if (productType === "dress") return t.cart.productDress;
    return t.cart.productGeneric;
  }

  return (
    <>
      <PageHero title={t.cart.title} description={t.cart.description} />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-beige-dark bg-white/70 px-6 py-14 text-center">
              <ShoppingBag
                className="mx-auto h-8 w-8 text-gold/70"
                strokeWidth={1.5}
              />
              <p className="mt-4 font-[family-name:var(--font-amiri)] text-xl text-charcoal">
                {t.cart.emptyTitle}
              </p>
              <p className="mt-2 text-sm text-muted">{t.cart.emptyHint}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/wedding-dresses">
                  <Button>{t.cart.browseDresses}</Button>
                </Link>
                <Link href="/veils">
                  <Button variant="outline">{t.cart.browseVeils}</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map((item, index) => {
                const displayName = resolveOrderLineName(
                  {
                    name_ar: item.name_ar,
                    name_en: item.name_en,
                    name_he: item.name_he,
                    product_type: item.product_type,
                  },
                  locale
                );
                return (
                  <div
                    key={`${item.line_id}-${index}`}
                    className="rounded-2xl border border-beige-dark bg-white p-5 md:p-6"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-2xl bg-beige">
                        {item.image && (
                          <Image
                            src={item.image}
                            alt={displayName}
                            fill
                            className="object-cover"
                            sizes="96px"
                          />
                        )}
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold text-charcoal">
                              {displayName}
                            </h3>
                            <p className="text-sm text-muted">
                              {cartLineTypeLabel(item.product_type)}
                            </p>
                          </div>
                          {!hidePrice && (
                            <ProductPrice
                              className="shrink-0"
                              size="sm"
                              {...cartLineDisplayPrices(item)}
                              showSaleBadge={false}
                            />
                          )}
                        </div>

                        <div className="flex flex-wrap items-end gap-3">
                          <div className="w-24">
                            <Input
                              id={`qty-${item.line_id}`}
                              label={t.common.quantity}
                              type="number"
                              min={1}
                              max={20}
                              value={String(item.quantity)}
                              onChange={(e) =>
                                updateQuantity(
                                  item.line_id,
                                  Number(e.target.value) || 1
                                )
                              }
                              dir="ltr"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.line_id)}
                            className="mb-2 inline-flex items-center gap-1 rounded-md text-sm text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:ring-offset-2"
                            aria-label={`${t.cart.remove} ${displayName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                            {t.cart.remove}
                          </button>
                        </div>

                        {item.personalization && (
                          <PersonalizationSummary
                            personalization={item.personalization}
                            compact
                            title={t.cart.personalizationTitle}
                          />
                        )}
                        {item.gift_options && (
                          <GiftOptionsSummary giftOptions={item.gift_options} />
                        )}
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

              <div className="rounded-2xl border border-gold/25 bg-beige/40 p-6">
                {!hidePrice && (
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-muted">{t.cart.lineTotal}</span>
                    <span className="text-2xl text-gold" dir="ltr">
                      {formatPrice(subtotal)}
                    </span>
                  </div>
                )}
                {hidePrice && (
                  <p className="mb-4 text-sm text-muted">{t.cart.pricesHidden}</p>
                )}
                <Link href="/checkout">
                  <Button size="lg" className="w-full sm:w-auto">
                    {t.cart.checkout}
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
