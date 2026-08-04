import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  isAccessoriesGroupCategory,
  resolveCategoryProductKind,
  type Category,
} from "@/types/category";
import { SEED_BRIDAL_ROBES, SEED_VEILS } from "@/lib/data/shop-seed";
import { SEED_DRESSES } from "@/lib/data/seed";

type CountRow = { category_id?: string | null; category?: string | null };

function bump(map: Map<string, number>, key: string | null | undefined, n = 1) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + n);
}

async function fetchDressCountRows(): Promise<CountRow[]> {
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

async function fetchAccessoryCount(table: "veils" | "bridal_robes"): Promise<number> {
  const supabase = createAdminClient();
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  query = query.eq("is_deleted", false) as typeof query;
  const { count, error } = await query;
  if (!error) return count ?? 0;

  const retry = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });
  if (!retry.error) return retry.count ?? 0;
  return 0;
}

function isVeilCategory(c: Category): boolean {
  const kind = resolveCategoryProductKind(c);
  if (kind === "veil") return true;
  const slug = c.slug?.trim().toLowerCase();
  const key = c.legacy_key?.trim().toLowerCase();
  return slug === "veils" || key === "veils" || key === "veil";
}

function isBridalRobeCategory(c: Category): boolean {
  const kind = resolveCategoryProductKind(c);
  if (kind === "bridal_robe") return true;
  const slug = c.slug?.trim().toLowerCase();
  const key = c.legacy_key?.trim().toLowerCase();
  return (
    slug === "robes" ||
    key === "bridal_robes" ||
    key === "robes" ||
    key === "bridal_robe"
  );
}

/**
 * Product counts per category id — dresses by category_id/TEXT,
 * plus veils/robes for accessory categories (aligned with storefront).
 */
export async function getCategoryProductCounts(
  categories: Category[]
): Promise<Record<string, number>> {
  const byId = new Map<string, number>();
  const byText = new Map<string, number>();
  let veilCount = 0;
  let robeCount = 0;

  if (!isSupabaseConfigured()) {
    for (const d of SEED_DRESSES) {
      bump(byText, d.category?.toLowerCase());
    }
    veilCount = SEED_VEILS.length;
    robeCount = SEED_BRIDAL_ROBES.length;
  } else {
    const [dresses, veils, robes] = await Promise.all([
      fetchDressCountRows(),
      fetchAccessoryCount("veils"),
      fetchAccessoryCount("bridal_robes"),
    ]);
    for (const row of dresses) {
      if (row.category_id) {
        bump(byId, row.category_id);
      } else {
        bump(byText, row.category?.trim().toLowerCase());
      }
    }
    veilCount = veils;
    robeCount = robes;
  }

  const counts: Record<string, number> = {};

  for (const c of categories) {
    if (isVeilCategory(c)) {
      counts[c.id] = veilCount;
      continue;
    }
    if (isBridalRobeCategory(c)) {
      counts[c.id] = robeCount;
      continue;
    }
    if (isAccessoriesGroupCategory(c)) {
      counts[c.id] = 0;
      continue;
    }

    let n = byId.get(c.id) ?? 0;
    const keys = [c.legacy_key, c.slug]
      .filter((k): k is string => Boolean(k?.trim()))
      .map((k) => k.trim().toLowerCase());
    const textSeen = new Set<string>();
    for (const k of keys) {
      if (textSeen.has(k)) continue;
      textSeen.add(k);
      n += byText.get(k) ?? 0;
    }
    counts[c.id] = n;
  }

  for (const c of categories) {
    if (!isAccessoriesGroupCategory(c)) continue;
    const childSum = categories
      .filter((child) => child.parent_id === c.id)
      .reduce((sum, child) => sum + (counts[child.id] ?? 0), 0);
    counts[c.id] = childSum > 0 ? childSum : veilCount + robeCount;
  }

  return counts;
}
