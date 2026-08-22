"use client";

import { HomeQuietLink } from "@/components/home/HomeQuietLink";
import { HomeProductTile } from "@/components/home/HomeProductTile";

export type HomeCollectionItem = {
  id: string;
  href: string;
  title: string;
  imageUrl: string | null;
  wishlist?: {
    productKind: string;
    productId: string;
    productSlug?: string;
    price?: number | null;
    salePrice?: number | null;
    nameAr?: string | null;
    nameEn?: string | null;
    nameHe?: string | null;
  };
};

type HomeCollectionSectionProps = {
  title: string;
  href: string;
  items: HomeCollectionItem[];
  viewLabel: string;
  /** Optional small caps line above the title. */
  eyebrow?: string;
  priority?: boolean;
};

/**
 * One category/collection band: quiet title, balanced product row, view link.
 * Always uses a multi-card grid — never a single full-width oversized image.
 */
export function HomeCollectionSection({
  title,
  href,
  items,
  viewLabel,
  eyebrow,
  priority = false,
}: HomeCollectionSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="bg-white py-10 md:py-14">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-5 text-center md:mb-7">
          {eyebrow ? (
            <p className="mb-2 font-[family-name:var(--font-cormorant)] text-[10px] tracking-[0.32em] text-gold uppercase md:text-xs">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-[family-name:var(--font-cormorant)] text-lg tracking-[0.12em] text-charcoal uppercase md:text-xl">
            {title}
          </h2>
        </div>

        {/* Fixed 2→3 column collection grid — cards share equal width */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-5">
          {items.map((item, i) => (
            <HomeProductTile
              key={item.id}
              href={item.href}
              imageUrl={item.imageUrl}
              title={item.title}
              priority={priority && i < 3}
              wishlist={item.wishlist}
            />
          ))}
        </div>

        <div className="mt-7 flex justify-center md:mt-9">
          <HomeQuietLink href={href}>{viewLabel}</HomeQuietLink>
        </div>
      </div>
    </section>
  );
}
