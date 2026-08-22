/**
 * Fill live price / names / image on wishlist rows so Add to basket works
 * even when older rows were saved without cart metadata.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { featuredImage } from "@/lib/products/featured-image";
import type { WishlistItem } from "@/lib/shop/wishlist";

type ProductSnap = {
  id: string;
  price?: number | null;
  sale_price?: number | null;
  name_ar?: string | null;
  name_en?: string | null;
  name_he?: string | null;
  images?: string[] | null;
  product_type?: string | null;
};

const TABLE_BY_KIND: Record<string, string> = {
  dress: "dresses",
  veil: "veils",
  bridal_robe: "bridal_robes",
  accessory_item: "accessory_items",
};

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

async function loadSnaps(
  table: string,
  ids: string[]
): Promise<Map<string, ProductSnap>> {
  const map = new Map<string, ProductSnap>();
  if (!ids.length) return map;
  const supabase = createAdminClient();
  const full = await supabase
    .from(table)
    .select("id, price, sale_price, name_ar, name_en, name_he, images, product_type")
    .in("id", ids);
  let rows: ProductSnap[] | null = (full.data as ProductSnap[] | null) ?? null;
  if (full.error) {
    const retry = await supabase
      .from(table)
      .select("id, price, name_ar, images")
      .in("id", ids);
    if (retry.error || !retry.data) return map;
    rows = retry.data as ProductSnap[];
  }
  for (const row of rows ?? []) {
    const snap = row as ProductSnap;
    if (snap.id) map.set(String(snap.id), snap);
  }
  return map;
}

export async function hydrateWishlistCartFields(
  items: WishlistItem[]
): Promise<WishlistItem[]> {
  if (!items.length || !isSupabaseConfigured()) return items;

  const idsByKind = new Map<string, string[]>();
  for (const item of items) {
    const table = TABLE_BY_KIND[item.product_kind];
    if (!table) continue;
    const list = idsByKind.get(item.product_kind) ?? [];
    list.push(item.product_id);
    idsByKind.set(item.product_kind, list);
  }

  const snapsByKind = new Map<string, Map<string, ProductSnap>>();
  await Promise.all(
    [...idsByKind.entries()].map(async ([kind, ids]) => {
      const table = TABLE_BY_KIND[kind];
      if (!table) return;
      snapsByKind.set(kind, await loadSnaps(table, [...new Set(ids)]));
    })
  );

  return items.map((item) => {
    const snap = snapsByKind.get(item.product_kind)?.get(item.product_id);
    if (!snap) return item;
    const price = num(item.price) ?? num(snap.price);
    const sale = num(item.sale_price) ?? num(snap.sale_price);
    const image =
      item.product_image_url?.trim() || featuredImage(snap.images) || null;
    return {
      ...item,
      price,
      sale_price: sale,
      name_ar: item.name_ar || snap.name_ar || null,
      name_en: item.name_en || snap.name_en || null,
      name_he: item.name_he || snap.name_he || null,
      product_title: item.product_title || snap.name_ar || null,
      product_image_url: image,
      commerce_type: snap.product_type ?? item.commerce_type ?? null,
    };
  });
}
