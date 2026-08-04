"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/utils";
import { ProductCardImageCarousel } from "@/components/shop/ProductCardImageCarousel";
import { Input, Select } from "@/components/ui/Input";

interface ShopCatalogItem {
  id: string;
  name_ar: string;
  price: number;
  images: string[];
  color: string | null;
  material: string | null;
  is_available: boolean;
  category?: string;
  size?: string | null;
  /** When set (e.g. mixed Bridal Accessories), used instead of basePath/id */
  href?: string;
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
      return (
        item.name_ar.toLowerCase().includes(q) ||
        (item.material?.toLowerCase().includes(q) ?? false) ||
        (item.category?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [items, search, color, category]);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <Input
          label="بحث"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحثي بالاسم..."
        />
        <Select
          label="اللون"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          options={[
            { value: "", label: "الكل" },
            ...colors.map((c) => ({ value: c, label: c })),
          ]}
        />
        {showCategoryFilter ? (
          <Select
            label="التصنيف"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={[
              { value: "", label: "الكل" },
              ...categoryOptions.map((c) => ({ value: c, label: c })),
            ]}
          />
        ) : (
          <div className="flex items-end text-sm text-muted">
            {filtered.length} منتج
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-muted">
          {items.length === 0
            ? "لا توجد منتجات في هذا القسم بعد"
            : "لا توجد منتجات مطابقة للبحث أو التصفية"}
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item, i) => {
            const href =
              item.href?.trim() ||
              (basePath ? `${basePath}/${item.id}` : `/${item.id}`);
            return (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group relative overflow-hidden rounded-2xl bg-white p-0 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
              >
                <ProductCardImageCarousel
                  images={item.images}
                  alt={item.name_ar}
                  href={href}
                  roundedClassName="rounded-none"
                  priority={i < 3}
                />
                {!item.is_available && (
                  <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-3">
                    <span className="rounded-full bg-charcoal/80 px-3 py-1 text-xs text-white">
                      غير متوفر
                    </span>
                  </div>
                )}
                <Link href={href} className="block p-5">
                  <h3 className="text-lg font-semibold text-charcoal transition-colors group-hover:text-gold">
                    {item.name_ar}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {item.color || item.material || ""}
                  </p>
                  <p
                    className="mt-3 font-[family-name:var(--font-cormorant)] text-xl text-gold"
                    dir="ltr"
                  >
                    {formatPrice(item.price)}
                  </p>
                </Link>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
