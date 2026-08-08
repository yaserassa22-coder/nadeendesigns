"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";
import { PageHero } from "@/components/dresses/DressCatalog";
import { Button } from "@/components/ui/Button";
import { useWishlist } from "@/components/shop/WishlistProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n";
import {
  wishlistKindLabel,
  wishlistProductHref,
} from "@/lib/shop/wishlist";

export function WishlistPage() {
  const { items, ready, remove, count } = useWishlist();
  const { t } = useLocale();

  const description = !ready
    ? t.common.loading
    : count
      ? formatMessage(t.wishlist.savedCount, { count })
      : t.wishlist.emptyHint;

  return (
    <>
      <PageHero title={t.wishlist.title} description={description} />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          {!ready ? (
            <div className="h-40 animate-pulse rounded-2xl bg-beige" />
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-beige-dark bg-white/70 px-6 py-14 text-center">
              <Heart className="mx-auto h-8 w-8 text-gold/70" strokeWidth={1.5} />
              <p className="mt-4 font-[family-name:var(--font-amiri)] text-xl text-charcoal">
                {t.wishlist.empty}
              </p>
              <p className="mt-2 text-sm text-muted">
                {t.wishlist.emptyDescription}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/wedding-dresses">
                  <Button>{t.nav.weddingDresses}</Button>
                </Link>
                <Link href="/veils">
                  <Button variant="outline">{t.nav.veils}</Button>
                </Link>
              </div>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {items.map((item) => {
                const href = wishlistProductHref(
                  item.product_kind,
                  item.product_id,
                  item.product_slug
                );
                return (
                  <li
                    key={item.id}
                    className="flex gap-3 rounded-2xl border border-beige-dark bg-white p-3 shadow-sm"
                  >
                    <Link
                      href={href}
                      className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-beige"
                    >
                      {item.product_image_url ? (
                        <Image
                          src={item.product_image_url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : null}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={href}
                        className="block truncate font-medium text-charcoal hover:text-gold"
                      >
                        {item.product_title || t.wishlist.piece}
                      </Link>
                      <p className="mt-1 text-xs text-muted">
                        {wishlistKindLabel(item.product_kind, t.cart)}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          void remove({
                            id: item.id.startsWith("tmp-")
                              ? undefined
                              : item.id,
                            productKind: item.product_kind,
                            productId: item.product_id,
                          })
                        }
                        className="mt-3 inline-flex items-center gap-1 text-xs text-red-700/80 hover:underline"
                      >
                        <Trash2 className="h-3 w-3" />
                        {t.wishlist.remove}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
