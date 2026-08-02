"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/utils";
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
}

interface ShopCatalogProps {
  items: ShopCatalogItem[];
  basePath: "/veils" | "/robes";
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
        (item.material?.toLowerCase().includes(q) ?? false)
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
        <p className="py-16 text-center text-muted">لا توجد منتجات مطابقة</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item, i) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`${basePath}/${item.id}`} className="group block">
                <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-beige">
                  {item.images[0] && (
                    <Image
                      src={item.images[0]}
                      alt={item.name_ar}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-semibold text-charcoal group-hover:text-gold">
                    {item.name_ar}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {item.color || item.material || ""}
                  </p>
                  <p className="mt-2 text-xl text-gold" dir="ltr">
                    {formatPrice(item.price)}
                  </p>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
}
