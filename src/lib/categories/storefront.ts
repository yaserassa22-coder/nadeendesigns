import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  isAccessoriesGroupCategory,
  resolveCategoryProductKind,
  type Category,
} from "@/types/category";
import { SEED_VEILS, SEED_BRIDAL_ROBES } from "@/lib/data/shop-seed";
import { SEED_DRESSES } from "@/lib/data/seed";

type CountRow = { category_id?: string | null; category?: string | null };

function bump(map: Map<string, number>, key: string | null | undefined, n = 1) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + n);
}

async function countDressRows(): Promise<CountRow[]> {
  const supabase = createAdminClient();
  let query = supabase.from("dresses").select("category_id, category");
  query = query.eq("is_deleted", false) as typeof query;
  const { data, error } = await query;
  if (!error && data) return data as CountRow[];

  const retry = await supabase.from("dresses").select("category_id, category");
  if (!retry.error && retry.data) return retry.data as CountRow[];

  const retry2 = await supabase.from("dresses").select("category");
  if (!retry2.error && retry2.data) return retry2.data as CountRow[];
  return [];
}

/** Veils / robes: no category_id in schema — count rows (+ optional TEXT category). */
async function countAccessoryRows(
  table: "veils" | "bridal_robes"
): Promise<CountRow[]> {
  const supabase = createAdminClient();
  let query = supabase.from(table).select("category");
  query = query.eq("is_deleted", false) as typeof query;
  const { data, error } = await query;
  if (!error && data) return data as CountRow[];

  const retry = await supabase.from(table).select("category");
  if (!retry.error && retry.data) return retry.data as CountRow[];

  const retry2 = await supabase.from(table).select("id");
  if (!retry2.error && retry2.data) {
    return retry2.data.map(() => ({}));
  }
  return [];
}

function seedProductKeys(): {
  byId: Map<string, number>;
  byText: Map<string, number>;
  veilCount: number;
  robeCount: number;
} {
  const byId = new Map<string, number>();
  const byText = new Map<string, number>();
  for (const d of SEED_DRESSES) {
    bump(byText, d.category?.toLowerCase());
  }
  return {
    byId,
    byText,
    veilCount: SEED_VEILS.length,
    robeCount: SEED_BRIDAL_ROBES.length,
  };
}

/**
 * Categories allowed on storefront nav / homepage / footer:
 * - is_visible !== false (draft/unpublished hidden)
 * - has at least one product (or accessories parent with a child that does)
 */
export async function filterStorefrontCategories(
  categories: Category[]
): Promise<Category[]> {
  const visible = categories.filter((c) => c.is_visible !== false);
  if (!visible.length) return [];

  let byId = new Map<string, number>();
  let byText = new Map<string, number>();
  let veilCount = 0;
  let robeCount = 0;

  if (!isSupabaseConfigured()) {
    const seed = seedProductKeys();
    byId = seed.byId;
    byText = seed.byText;
    veilCount = seed.veilCount;
    robeCount = seed.robeCount;
  } else {
    const [dresses, veils, robes] = await Promise.all([
      countDressRows(),
      countAccessoryRows("veils"),
      countAccessoryRows("bridal_robes"),
    ]);
    for (const row of dresses) {
      bump(byId, row.category_id);
      bump(byText, row.category?.trim().toLowerCase());
    }
    veilCount = veils.length;
    robeCount = robes.length;
    for (const row of veils) {
      bump(byText, row.category?.trim().toLowerCase());
    }
    for (const row of robes) {
      bump(byText, row.category?.trim().toLowerCase());
    }
  }

  const hasProducts = (c: Category): boolean => {
    if ((byId.get(c.id) ?? 0) > 0) return true;
    const keys = [c.legacy_key, c.slug]
      .filter((k): k is string => Boolean(k?.trim()))
      .map((k) => k.trim().toLowerCase());
    if (keys.some((k) => (byText.get(k) ?? 0) > 0)) return true;

    const kind = resolveCategoryProductKind(c);
    if (kind === "veil") return veilCount > 0;
    if (kind === "bridal_robe") return robeCount > 0;
    return false;
  };

  const leafOk = new Set<string>();
  for (const c of visible) {
    if (isAccessoriesGroupCategory(c)) continue;
    if (hasProducts(c)) leafOk.add(c.id);
  }

  // Accessories parent stays if any visible child has products
  for (const c of visible) {
    if (!isAccessoriesGroupCategory(c)) continue;
    const childHas = visible.some(
      (child) => child.parent_id === c.id && leafOk.has(child.id)
    );
    if (childHas) leafOk.add(c.id);
  }

  return visible.filter((c) => leafOk.has(c.id));
}
