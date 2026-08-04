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

export async function getVeils(): Promise<Veil[]> {
  if (!isSupabaseConfigured()) return SEED_VEILS;
  const rows = await selectShopTable<Veil & LifecycleRow>("veils");
  return rows ?? SEED_VEILS;
}

export async function getVeilById(id: string): Promise<Veil | null> {
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
  if (!isPublicRow(row)) return null;
  return row;
}

export async function getBridalRobes(): Promise<BridalRobe[]> {
  if (!isSupabaseConfigured()) return SEED_BRIDAL_ROBES;
  const rows = await selectShopTable<BridalRobe & LifecycleRow>("bridal_robes");
  return rows ?? SEED_BRIDAL_ROBES;
}

export async function getBridalRobeById(id: string): Promise<BridalRobe | null> {
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
  if (!isPublicRow(row)) return null;
  return row;
}

/** Unified storefront card for Bridal Accessories (veils ∪ bridal_robes). */
export type AccessoryShopItem = {
  id: string;
  name_ar: string;
  price: number;
  images: string[];
  color: string | null;
  material: string | null;
  is_available: boolean;
  /** Filter label: veil style or "برنص العروس" */
  category: string;
  size?: string | null;
  href: string;
  kind: "veil" | "bridal_robe";
  created_at: string;
};

/**
 * All published accessory products for the Bridal Accessories collection.
 * Veils and robes live in separate tables — this is the storefront union.
 */
export async function getBridalAccessoriesProducts(): Promise<AccessoryShopItem[]> {
  const [veils, robes] = await Promise.all([getVeils(), getBridalRobes()]);

  const fromVeils: AccessoryShopItem[] = veils.map((v) => ({
    id: v.id,
    name_ar: v.name_ar,
    price: v.price,
    images: v.images ?? [],
    color: v.color,
    material: v.material,
    is_available: v.is_available,
    category: v.category?.trim() || "طرحة العروس",
    href: `/veils/${v.id}`,
    kind: "veil",
    created_at: v.created_at,
  }));

  const fromRobes: AccessoryShopItem[] = robes.map((r) => ({
    id: r.id,
    name_ar: r.name_ar,
    price: r.price,
    images: r.images ?? [],
    color: r.color,
    material: r.material,
    is_available: r.is_available,
    category: "برنص العروس",
    size: r.size,
    href: `/robes/${r.id}`,
    kind: "bridal_robe",
    created_at: r.created_at,
  }));

  return [...fromVeils, ...fromRobes].sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );
}
