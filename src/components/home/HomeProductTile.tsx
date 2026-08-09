"use client";

import Image from "next/image";
import Link from "next/link";
import { WishlistButton } from "@/components/auth/WishlistButton";
import { cn } from "@/lib/utils";

type HomeProductTileProps = {
  href: string;
  imageUrl: string | null | undefined;
  title: string;
  /** Optional quiet price line under the title */
  priceLabel?: string | null;
  priority?: boolean;
  className?: string;
  /** Wishlist chrome — omit when not a wishlistable product. */
  wishlist?: {
    productKind: string;
    productId: string;
    productSlug?: string;
  };
};

/**
 * Balanced collection card: fixed portrait frame, cover crop, quiet title.
 * Width comes from the parent grid — never stretches to a single full-bleed column.
 */
export function HomeProductTile({
  href,
  imageUrl,
  title,
  priceLabel,
  priority = false,
  className,
  wishlist,
}: HomeProductTileProps) {
  const cover = imageUrl?.trim() || "";

  return (
    <article className={cn("relative min-w-0", className)}>
      <Link
        href={href}
        className="group relative block overflow-hidden bg-beige"
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden">
          {cover ? (
            <Image
              src={cover}
              alt={title}
              fill
              priority={priority}
              quality={85}
              sizes="(max-width: 1024px) 50vw, 33vw"
              className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 bg-beige-dark/50" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/55 via-charcoal/5 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 z-10 p-3 md:p-4">
            <h3 className="line-clamp-2 font-[family-name:var(--font-cormorant)] text-sm leading-snug tracking-[0.04em] text-ivory md:text-base">
              {title}
            </h3>
            {priceLabel ? (
              <p className="mt-1 text-[11px] tracking-[0.08em] text-ivory/75 md:text-xs" dir="ltr">
                {priceLabel}
              </p>
            ) : null}
          </div>
        </div>
      </Link>
      {wishlist ? (
        <div className="absolute end-2.5 top-2.5 z-20 md:end-3 md:top-3">
          <WishlistButton
            variant="icon"
            productKind={wishlist.productKind}
            productId={wishlist.productId}
            productSlug={wishlist.productSlug ?? wishlist.productId}
            productTitle={title}
            productImageUrl={cover || undefined}
          />
        </div>
      ) : null}
    </article>
  );
}
