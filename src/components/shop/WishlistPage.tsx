"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";
import { PageHero } from "@/components/dresses/DressCatalog";
import { Button } from "@/components/ui/Button";
import { useWishlist } from "@/components/shop/WishlistProvider";
import {
  wishlistKindLabel,
  wishlistProductHref,
} from "@/lib/shop/wishlist";

export function WishlistPage() {
  const { items, ready, remove, count } = useWishlist();

  return (
    <>
      <PageHero
        title="قائمة الأمنيات"
        description={
          ready
            ? count
              ? `${count} قطعة محفوظة`
              : "احفظي القطع التي تحبينها."
            : "جاري التحميل…"
        }
      />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          {!ready ? (
            <div className="h-40 animate-pulse rounded-2xl bg-beige" />
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-beige-dark bg-white/70 px-6 py-14 text-center">
              <Heart className="mx-auto h-8 w-8 text-gold/70" strokeWidth={1.5} />
              <p className="mt-4 font-[family-name:var(--font-amiri)] text-xl text-charcoal">
                قائمة الأمنيات فارغة
              </p>
              <p className="mt-2 text-sm text-muted">
                اضغطي على القلب بجانب أي قطعة لإضافتها هنا — بدون الحاجة لتسجيل
                الدخول.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/wedding-dresses">
                  <Button>فساتين الزفاف</Button>
                </Link>
                <Link href="/veils">
                  <Button variant="outline">طرحة العروس</Button>
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
                        {item.product_title || "قطعة"}
                      </Link>
                      <p className="mt-1 text-xs text-muted">
                        {wishlistKindLabel(item.product_kind)}
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
                        إزالة
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
