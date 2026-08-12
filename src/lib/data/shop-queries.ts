import { cache } from "react";
import { SEED_BRIDAL_ROBES, SEED_VEILS } from "@/lib/data/shop-seed";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { BridalRobe, Veil } from "@/types/shop";

type LifecycleRow = {
  is_deleted?: boolean | null;
  archived_at?: string | null;
};

function isPublicRow(row: LifecycleRow): boolean {
  if (row.is_deleted === true) return false;
  if (row.archived_at) return false;
  return true;
}

async function selectShopTable<T extends LifecycleRow>(
  table: "veils" | "bridal_robes"
): Promise<T[] | null> {
  const supabase = await createClient();
  let query = supabase
    .from(table)
    .select("*")
    .order("created_at", { ascending: false });
  query = query.eq("is_deleted", false).is("archived_at", null) as typeof query;

  let { data, error } = await query;
  if (error && /is_deleted|archived_at|PGRST204|42703/i.test(error.message ?? "")) {
    const retry = await supabase
      .from(table)
      .select("*")
      .order("created_at", { ascending: false });
    data = retry.data;
    error = retry.error;
  }
  if (error || !data) return null;
  return (data as T[]).filter(isPublicRow);
}

function isShopPublic(item: { is_available?: boolean | null }): boolean {
  return item.is_available !== false;
}

export async function getVeils(): Promise<Veil[]> {
  if (!isSupabaseConfigured()) {
    return SEED_VEILS.filter(isShopPublic);
  }
  const rows = await selectShopTable<Veil & LifecycleRow>("veils");
  return (rows ?? SEED_VEILS).filter(isShopPublic);
}

export const getVeilById = cache(async function getVeilById(
  id: string
): Promise<Veil | null> {
  if (!isSupabaseConfigured()) {
    return SEED_VEILS.find((v) => v.id === id) ?? null;
  }
  const supabase = await createClient();
  let query = supabase.from("veils").select("*").eq("id", id);
  query = query.eq("is_deleted", false).is("archived_at", null) as typeof query;
  let { data, error } = await query.maybeSingle();
  if (error && /is_deleted|archived_at|PGRST204|42703/i.test(error.message ?? "")) {
    const retry = await supabase
      .from("veils")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    data = retry.data;
    error = retry.error;
  }
  if (error || !data) {
    return SEED_VEILS.find((v) => v.id === id) ?? null;
  }
  const row = data as Veil & LifecycleRow;
  if (!isPublicRow(row) || !isShopPublic(row)) return null;
  return row;
});

export async function getRelatedVeils(
  excludeId: string,
  limit = 3
): Promise<Veil[]> {
  const take = Math.max(1, limit);
  if (!isSupabaseConfigured()) {
    return SEED_VEILS.filter((v) => v.id !== excludeId && isShopPublic(v)).slice(
      0,
      take
    );
  }
  const supabase = await createClient();
  let query = supabase
    .from("veils")
    .select("*")
    .neq("id", excludeId)
    .order("created_at", { ascending: false })
    .limit(take + 6);
  query = query.eq("is_deleted", false).is("archived_at", null) as typeof query;
  let { data, error } = await query;
  if (error && /is_deleted|archived_at|PGRST204|42703/i.test(error.message ?? "")) {
    const retry = await supabase
      .from("veils")
      .select("*")
      .neq("id", excludeId)
      .order("created_at", { ascending: false })
      .limit(take + 6);
    data = retry.data;
    error = retry.error;
  }
  if (error || !data) {
    return SEED_VEILS.filter((v) => v.id !== excludeId && isShopPublic(v)).slice(
      0,
      take
    );
  }
  return (data as (Veil & LifecycleRow)[])
    .filter((row) => isPublicRow(row) && isShopPublic(row) && row.id !== excludeId)
    .slice(0, take);
}

export async function getBridalRobes(): Promise<BridalRobe[]> {
  if (!isSupabaseConfigured()) {
    return SEED_BRIDAL_ROBES.filter(isShopPublic);
  }
  const rows = await selectShopTable<BridalRobe & LifecycleRow>("bridal_robes");
  return (rows ?? SEED_BRIDAL_ROBES).filter(isShopPublic);
}

export const getBridalRobeById = cache(async function getBridalRobeById(
  id: string
): Promise<BridalRobe | null> {
  if (!isSupabaseConfigured()) {
    return SEED_BRIDAL_ROBES.find((r) => r.id === id) ?? null;
  }
  const supabase = await createClient();
  let query = supabase.from("bridal_robes").select("*").eq("id", id);
  query = query.eq("is_deleted", false).is("archived_at", null) as typeof query;
  let { data, error } = await query.maybeSingle();
  if (error && /is_deleted|archived_at|PGRST204|42703/i.test(error.message ?? "")) {
    const retry = await supabase
      .from("bridal_robes")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    data = retry.data;
    error = retry.error;
  }
  if (error || !data) {
    return SEED_BRIDAL_ROBES.find((r) => r.id === id) ?? null;
  }
  const row = data as BridalRobe & LifecycleRow;
  if (!isPublicRow(row) || !isShopPublic(row)) return null;
  return row;
});

export async function getRelatedBridalRobes(
  excludeId: string,
  limit = 3
): Promise<BridalRobe[]> {
  const take = Math.max(1, limit);
  if (!isSupabaseConfigured()) {
    return SEED_BRIDAL_ROBES.filter(
      (r) => r.id !== excludeId && isShopPublic(r)
    ).slice(0, take);
  }
  const supabase = await createClient();
  let query = supabase
    .from("bridal_robes")
    .select("*")
    .neq("id", excludeId)
    .order("created_at", { ascending: false })
    .limit(take + 6);
  query = query.eq("is_deleted", false).is("archived_at", null) as typeof query;
  let { data, error } = await query;
  if (error && /is_deleted|archived_at|PGRST204|42703/i.test(error.message ?? "")) {
    const retry = await supabase
      .from("bridal_robes")
      .select("*")
      .neq("id", excludeId)
      .order("created_at", { ascending: false })
      .limit(take + 6);
    data = retry.data;
    error = retry.error;
  }
  if (error || !data) {
    return SEED_BRIDAL_ROBES.filter(
      (r) => r.id !== excludeId && isShopPublic(r)
    ).slice(0, take);
  }
  return (data as (BridalRobe & LifecycleRow)[])
    .filter((row) => isPublicRow(row) && isShopPublic(row) && row.id !== excludeId)
    .slice(0, take);
}

/** Unified storefront card for Bridal Accessories (veils ∪ bridal_robes). */
export type AccessoryShopItem = {
  id: string;
  name_ar: string;
  name_en?: string | null;
  name_he?: string | null;
  price: number;
  sale_price?: number | null;
  images: string[];
  color: string | null;
  material: string | null;
  is_available: boolean;
  is_featured: boolean;
  /** Filter label: veil style or bridal robe — localized on storefront via resolveCatalogLabel */
  category: string;
  size?: string | null;
  href: string;
  kind: "veil" | "bridal_robe";
  /** Always bridal_accessory — storefront CTA source of truth */
  product_type: "bridal_accessory";
  created_at: string;
};

/**
 * All published accessory products for the Bridal Accessories collection.
 * Veils and robes live in separate tables — this is the storefront union.
 * Ordering: featured first, then newest (existing product flags / timestamps).
 */
export async function getBridalAccessoriesProducts(): Promise<AccessoryShopItem[]> {
  const [veils, robes] = await Promise.all([getVeils(), getBridalRobes()]);

  const fromVeils: AccessoryShopItem[] = veils.map((v) => ({
    id: v.id,
    name_ar: v.name_ar,
    name_en: v.name_en,
    name_he: v.name_he,
    price: v.price,
    sale_price: v.sale_price ?? null,
    images: v.images ?? [],
    color: v.color,
    material: v.material,
    is_available: v.is_available,
    is_featured: Boolean(v.is_featured),
    category: v.category?.trim() || "طرحة العروس",
    href: `/veils/${v.id}`,
    kind: "veil",
    /** Commerce type always bridal_accessory for veils */
    product_type: "bridal_accessory" as const,
    created_at: v.created_at,
  }));

  const fromRobes: AccessoryShopItem[] = robes.map((r) => ({
    id: r.id,
    name_ar: r.name_ar,
    name_en: r.name_en,
    name_he: r.name_he,
    price: r.price,
    sale_price: r.sale_price ?? null,
    images: r.images ?? [],
    color: r.color,
    material: r.material,
    is_available: r.is_available,
    is_featured: Boolean(r.is_featured),
    category: "برنص العروس",
    size: r.size,
    href: `/robes/${r.id}`,
    kind: "bridal_robe",
    product_type: "bridal_accessory" as const,
    created_at: r.created_at,
  }));

  return [...fromVeils, ...fromRobes].sort((a, b) => {
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
    return b.created_at.localeCompare(a.created_at);
  });
}
