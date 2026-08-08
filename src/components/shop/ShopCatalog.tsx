"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { featuredImage } from "@/lib/products/featured-image";
import { inferWishlistKind } from "@/lib/shop/wishlist";
import { ProductCardImageCarousel } from "@/components/shop/ProductCardImageCarousel";
import { WishlistButton } from "@/components/auth/WishlistButton";
import { ProductPrice } from "@/components/product/ProductPrice";
import { Input, Select } from "@/components/ui/Input";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatMessage, localizedName } from "@/lib/i18n";
import { resolveCatalogLabel } from "@/lib/i18n/category-labels";
import {
  resolveDressColorLabel,
  resolveDressMaterialLabel,
} from "@/lib/i18n/attribute-labels";

interface ShopCatalogItem {
  id: string;
  name_ar: string;
  name_en?: string | null;
  name_he?: string | null;
  price: number;
  /** Optional — dresses may have sale; veils/robes typically omit. */
  sale_price?: number | null;
  images: string[];
  color: string | null;
  material: string | null;
  is_available: boolean;
  category?: string;
  size?: string | null;
  /** When set (e.g. mixed Bridal Accessories), used instead of basePath/id */
  href?: string;
  kind?: "veil" | "bridal_robe" | "dress" | string;
  is_featured?: boolean;
  tags?: string[] | null;
}

interface ShopCatalogProps {
  items: ShopCatalogItem[];
  /** Required unless every item provides its own href */
  basePath?: "/veils" | "/robes";
  showCategoryFilter?: boolean;
  categoryOptions?: string[];
}

export function ShopCatalog({
  items,
  basePath,
  showCategoryFilter = false,
  categoryOptions = [],
}: ShopCatalogProps) {
  const { t, locale } = useLocale();
  const [search, setSearch] = useState("");
  const [color, setColor] = useState("");
  const [category, setCategory] = useState("");

  const colors = useMemo(
    () =>
      Array.from(new Set(items.map((i) => i.color).filter(Boolean))) as string[],
    [items]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (color && item.color !== color) return false;
      if (category && item.category !== category) return false;
      if (!q) return true;
      const display = localizedName(item, locale, item.name_ar).toLowerCase();
      return (
        display.includes(q) ||
        item.name_ar.toLowerCase().includes(q) ||
        (item.name_en?.toLowerCase().includes(q) ?? false) ||
        (item.name_he?.toLowerCase().includes(q) ?? false) ||
        (item.material?.toLowerCase().includes(q) ?? false) ||
        (item.category?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [items, search, color, category, locale]);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <Input
          label={t.common.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.shop.searchPlaceholder}
        />
        <Select
          label={t.shop.color}
          value={color}
          onChange={(e) => setColor(e.target.value)}
          options={[
            { value: "", label: t.shop.all },
            ...colors.map((c) => ({
              value: c,
              label: resolveDressColorLabel(c, locale),
            })),
          ]}
        />
        {showCategoryFilter ? (
          <Select
            label={t.shop.category}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={[
              { value: "", label: t.shop.all },
              ...categoryOptions.map((c) => ({
                value: c,
                label: resolveCatalogLabel(c, locale),
              })),
            ]}
          />
        ) : (
          <div className="flex items-end text-sm text-muted">
            {formatMessage(t.shop.productCount, { count: filtered.length })}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-muted">
          {items.length === 0 ? t.shop.noProductsInSection : t.shop.noMatch}
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item, i) => {
            const href =
              item.href?.trim() ||
              (basePath ? `${basePath}/${item.id}` : `/${item.id}`);
            const productKind = inferWishlistKind({
              kind: item.kind,
              basePath,
              href,
            });
            const displayName = localizedName(item, locale, item.name_ar);
            return (
              <motion.article
                key={`${productKind}-${item.id}`}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group relative overflow-hidden rounded-2xl bg-white p-0 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
              >
                <div className="relative">
                  <ProductCardImageCarousel
                    images={item.images}
                    alt={displayName}
                    href={href}
                    roundedClassName="rounded-none"
                    priority={i < 3}
                    overlay={{
                      price: item.price,
                      salePrice: item.sale_price,
                      isFeatured: item.is_featured,
                      tags: item.tags,
                      wishlist: (
                        <WishlistButton
                          variant="icon"
                          productKind={productKind}
                          productId={item.id}
                          productSlug={item.id}
                          productTitle={displayName}
                          productImageUrl={featuredImage(item.images)}
                        />
                      ),
                    }}
                  />
                  {!item.is_available && (
                    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-charcoal/50">
                      <span className="rounded-full bg-white px-4 py-2 text-sm font-medium">
                        {t.product.outOfStock}
                      </span>
                    </div>
                  )}
                </div>
                <Link href={href} className="block p-5">
                  <h3 className="text-lg font-semibold text-charcoal transition-colors group-hover:text-gold">
                    {displayName}
                  </h3>
                  {(item.color || item.material) && (
                    <p className="mt-1 text-sm text-muted">
                      {[
                        item.color
                          ? resolveDressColorLabel(item.color, locale)
                          : null,
                        item.material
                          ? resolveDressMaterialLabel(item.material, locale)
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  <ProductPrice
                    className="mt-3"
                    price={item.price}
                    salePrice={item.sale_price}
                    showSaleBadge={false}
                  />
                </Link>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
