import type { Dress, DressFilters, GalleryItem, SiteSettings } from "@/types";
import {
  DEFAULT_SETTINGS,
} from "@/lib/constants";
import { normalizeSiteSettings } from "@/lib/settings";
import { SEED_DRESSES, SEED_GALLERY } from "@/lib/data/seed";
import {
  categoryQueryValues,
  normalizeDressList,
  withNormalizedDressCategory,
} from "@/lib/dresses/category";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

function dressMatchesCategoryFilter(
  dress: Dress,
  filters: DressFilters
): boolean {
  const idMatch = Boolean(
    filters.categoryId && dress.category_id === filters.categoryId
  );
  if (filters.category) {
    const allowed = new Set(categoryQueryValues(filters.category));
    const textMatch =
      allowed.has(dress.category) || dress.category === filters.category;
    // Union: category_id OR TEXT (partial FK backfill must not hide rows)
    if (filters.categoryId) return idMatch || textMatch;
    return textMatch;
  }
  if (filters.categoryId) return idMatch;
  return true;
}

export async function getDresses(filters?: DressFilters): Promise<Dress[]> {
  let dresses: Dress[];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    let query = supabase
      .from("dresses")
      .select("*")
      .order("created_at", { ascending: false });

    query = query.eq("is_deleted", false).is("archived_at", null) as typeof query;

    if (filters?.categoryId) {
      query = query.eq("category_id", filters.categoryId) as typeof query;
    } else if (filters?.category) {
      const values = categoryQueryValues(filters.category);
      query =
        values.length > 1
          ? query.in("category", values)
          : query.eq("category", values[0]);
    }
    if (filters?.featured) query = query.eq("is_featured", true);
    if (filters?.style) query = query.eq("style", filters.style);
    if (filters?.color) query = query.eq("color", filters.color);
    if (filters?.size) query = query.eq("size", filters.size);

    let { data, error } = await query;
    if (error && /is_deleted|archived_at|category_id|PGRST204|42703/i.test(error.message ?? "")) {
      let retry = supabase
        .from("dresses")
        .select("*")
        .order("created_at", { ascending: false });
      if (filters?.category) {
        const values = categoryQueryValues(filters.category);
        retry =
          values.length > 1
            ? retry.in("category", values)
            : retry.eq("category", values[0]);
      }
      if (filters?.featured) retry = retry.eq("is_featured", true);
      if (filters?.style) retry = retry.eq("style", filters.style);
      if (filters?.color) retry = retry.eq("color", filters.color);
      if (filters?.size) retry = retry.eq("size", filters.size);
      const second = await retry;
      data = second.data;
      error = second.error;
    }
    dresses = error
      ? normalizeDressList(SEED_DRESSES)
      : normalizeDressList(data as Dress[]);
  } else {
    dresses = normalizeDressList(SEED_DRESSES);
  }

  if (filters?.categoryId || filters?.category) {
    dresses = dresses.filter((d) => dressMatchesCategoryFilter(d, filters));
  }
  if (filters?.featured) {
    dresses = dresses.filter((d) => d.is_featured);
  }
  if (filters?.style) {
    dresses = dresses.filter((d) => d.style === filters.style);
  }
  if (filters?.color) {
    dresses = dresses.filter((d) => d.color === filters.color);
  }
  if (filters?.size) {
    dresses = dresses.filter((d) => d.size === filters.size);
  }
  if (filters?.minPrice) {
    dresses = dresses.filter(
      (d) => (d.price ?? d.rental_price ?? 0) >= filters.minPrice!
    );
  }
  if (filters?.maxPrice) {
    dresses = dresses.filter(
      (d) => (d.price ?? d.rental_price ?? Infinity) <= filters.maxPrice!
    );
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    dresses = dresses.filter(
      (d) =>
        d.name_ar.toLowerCase().includes(q) ||
        d.description_ar.toLowerCase().includes(q) ||
        (d.style?.toLowerCase().includes(q) ?? false)
    );
  }

  return dresses;
}

/**
 * Load dresses for a resolved Category row (id + slug + legacy_key union).
 */
export async function getDressesForCategory(category: {
  id: string;
  slug: string;
  legacy_key?: string | null;
}): Promise<Dress[]> {
  return getDressesByCategoryKeys(
    [category.slug, category.legacy_key],
    category.id
  );
}

/**
 * Load dresses for a category by id and/or TEXT keys (slug / legacy_key).
 * Unions category_id matches with TEXT dual-write rows so partial FK
 * backfills never hide products that only have the legacy TEXT key.
 */
export async function getDressesByCategoryKeys(
  keys: Array<string | null | undefined>,
  categoryId?: string | null
): Promise<Dress[]> {
  const unique = [
    ...new Set(
      keys
        .map((k) => k?.trim())
        .filter((k): k is string => Boolean(k))
        .flatMap((k) => categoryQueryValues(k))
    ),
  ];

  const byId = categoryId ? await getDresses({ categoryId }) : [];

  let byText: Dress[] = [];
  if (unique.length === 1) {
    byText = await getDresses({ category: unique[0] });
  } else if (unique.length > 1) {
    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      let query = supabase
        .from("dresses")
        .select("*")
        .in("category", unique)
        .order("created_at", { ascending: false });
      query = query.eq("is_deleted", false).is("archived_at", null) as typeof query;

      let { data, error } = await query;
      if (error && /is_deleted|archived_at|PGRST204|42703/i.test(error.message ?? "")) {
        const retry = await supabase
          .from("dresses")
          .select("*")
          .in("category", unique)
          .order("created_at", { ascending: false });
        data = retry.data;
        error = retry.error;
      }
      byText = error
        ? normalizeDressList(SEED_DRESSES).filter((d) => unique.includes(d.category))
        : normalizeDressList(data as Dress[]);
    } else {
      byText = normalizeDressList(SEED_DRESSES).filter((d) =>
        unique.includes(d.category)
      );
    }
  }

  const allowed = new Set(unique);
  const merged = new Map<string, Dress>();
  for (const d of byId) merged.set(d.id, d);
  for (const d of byText) {
    if (
      (categoryId && d.category_id === categoryId) ||
      allowed.has(d.category) ||
      !categoryId
    ) {
      merged.set(d.id, d);
    }
  }

  if (!categoryId && unique.length === 0) return [];
  return [...merged.values()].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getDressById(id: string): Promise<Dress | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    let query = supabase.from("dresses").select("*").eq("id", id);
    query = query.eq("is_deleted", false).is("archived_at", null) as typeof query;
    let { data, error } = await query.maybeSingle();
    if (error && /is_deleted|archived_at|PGRST204|42703/i.test(error.message ?? "")) {
      const retry = await supabase
        .from("dresses")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      data = retry.data;
      error = retry.error;
    }
    if (!error && data) {
      const row = data as Dress & {
        is_deleted?: boolean;
        archived_at?: string | null;
      };
      if (row.is_deleted || row.archived_at) return null;
      return withNormalizedDressCategory(row);
    }
  }
  const seed = SEED_DRESSES.find((d) => d.id === id);
  return seed ? withNormalizedDressCategory(seed) : null;
}

export async function getGalleryItems(): Promise<GalleryItem[]> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    let query = supabase
      .from("gallery_items")
      .select("*")
      .order("sort_order", { ascending: true });
    query = query.eq("is_deleted", false).is("archived_at", null) as typeof query;
    let { data, error } = await query;
    if (error && /is_deleted|archived_at|PGRST204|42703/i.test(error.message ?? "")) {
      const retry = await supabase
        .from("gallery_items")
        .select("*")
        .order("sort_order", { ascending: true });
      data = retry.data;
      error = retry.error;
    }
    if (!error && data) return data as GalleryItem[];
  }
  return SEED_GALLERY;
}

export async function getSettings(): Promise<SiteSettings> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "site")
      .single();
    if (!error && data?.value) {
      return normalizeSiteSettings(data.value as SiteSettings);
    }
  }
  return normalizeSiteSettings(DEFAULT_SETTINGS);
}

export async function getFeaturedDresses(limit = 3): Promise<Dress[]> {
  const dresses = await getDresses({ featured: true });
  const prioritized = [...dresses].sort((a, b) => {
    if (a.id === "royal-lace") return -1;
    if (b.id === "royal-lace") return 1;
    return 0;
  });
  return prioritized.slice(0, limit);
}
