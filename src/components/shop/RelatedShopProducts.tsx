import Link from "next/link";
import { ProductCardImageCarousel } from "@/components/shop/ProductCardImageCarousel";
import { WishlistButton } from "@/components/auth/WishlistButton";
import { featuredImage } from "@/lib/products/featured-image";
import { inferWishlistKind } from "@/lib/shop/wishlist";
import { formatPrice } from "@/lib/utils";

export type RelatedShopItem = {
  id: string;
  name_ar: string;
  price: number;
  images: string[];
  href: string;
  subtitle?: string;
  kind?: string;
};

interface RelatedShopProductsProps {
  items: RelatedShopItem[];
  title?: string;
}

export function RelatedShopProducts({
  items,
  title = "منتجات ذات صلة",
}: RelatedShopProductsProps) {
  if (!items.length) return null;

  return (
    <section className="mt-16 border-t border-beige-dark pt-16 md:mt-24 md:pt-20">
      <h2 className="mb-8 text-center text-2xl font-semibold text-charcoal md:text-3xl">
        {title}
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <article
            key={item.id}
            className="group overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-xl"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="relative">
              <ProductCardImageCarousel
                images={item.images}
                alt={item.name_ar}
                href={item.href}
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              <WishlistButton
                variant="icon"
                productKind={inferWishlistKind({
                  kind: item.kind,
                  href: item.href,
                })}
                productId={item.id}
                productSlug={item.id}
                productTitle={item.name_ar}
                productImageUrl={featuredImage(item.images)}
              />
            </div>
            <Link href={item.href} className="block p-5">
              <h3 className="text-lg font-semibold text-charcoal transition-colors group-hover:text-gold">
                {item.name_ar}
              </h3>
              {item.subtitle && (
                <p className="mt-1 text-sm text-muted">{item.subtitle}</p>
              )}
              <p className="mt-2 text-xl text-gold" dir="ltr">
                {formatPrice(item.price)}
              </p>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
