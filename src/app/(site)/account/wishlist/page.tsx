"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Item = {
  id: string;
  product_title?: string | null;
  product_image_url?: string | null;
  product_slug?: string | null;
  product_kind?: string;
};

export default function AccountWishlistPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const d = await fetch("/api/account/wishlist").then((r) => r.json());
    setItems(d.items ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function remove(id: string) {
    await fetch(`/api/account/wishlist?id=${id}`, { method: "DELETE" });
    void load();
  }

  if (loading) return <div className="h-40 animate-pulse rounded-2xl bg-beige" />;

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-beige-dark bg-white/60 px-6 py-12 text-center">
        <p className="font-[family-name:var(--font-amiri)] text-xl">قائمة الأمنيات فارغة</p>
        <Link href="/" className="mt-3 inline-block text-sm" style={{ color: "#C9A14A" }}>
          تصفّح المجموعة
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex gap-3 rounded-2xl border border-beige-dark bg-white p-3"
        >
          {item.product_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.product_image_url}
              alt=""
              className="h-20 w-16 rounded-lg object-cover"
            />
          ) : (
            <div className="h-20 w-16 rounded-lg bg-beige" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{item.product_title || "قطعة"}</p>
            <p className="text-xs text-muted">{item.product_kind}</p>
            <button
              type="button"
              onClick={() => void remove(item.id)}
              className="mt-2 text-xs text-red-700/80 hover:underline"
            >
              إزالة
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
