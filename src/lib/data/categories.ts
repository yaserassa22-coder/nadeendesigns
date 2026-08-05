import {
  SEED_CATEGORIES,
  isHomepageCategory,
  resolveCategoryProductKind,
  type Category,
  type CategoryProductKind,
} from "@/types/category";
import {
  filterLifecycleRows,
  isLifecycleSchemaError,
} from "@/lib/admin/query-lifecycle";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Ensure new columns exist on rows from older DB schemas. */
export function normalizeCategoryRow(row: Category): Category {
  // Leaf categories must not use accessories_group — that kind is only for the
  // bridal-accessories container. Children (e.g. سنسال) are product-assignable.
  const rawKind =
    (row.product_kind as CategoryProductKind | null) ??
    resolveCategoryProductKind(row);
  const product_kind: CategoryProductKind | null =
    rawKind === "accessories_group" && row.parent_id
      ? "dress"
      : rawKind;

  return {
    ...row,
    // Pre-033 DBs omit these — treat as enabled so existing catalogs keep working.
    visible_in_navigation: row.visible_in_navigation !== false,
    show_on_homepage: row.show_on_homepage !== false,
    featured_collection: row.featured_collection === true,
    product_kind,
    seo_title_ar: row.seo_title_ar ?? null,
    seo_description_ar: row.seo_description_ar ?? null,
    seo_og_image_url: row.seo_og_image_url ?? null,
  };
}

/**
 * Public categories for storefront nav/homepage.
 * Uses the anon/service client (no cookies) so layout can stay cache-friendly.
 * Soft-deleted / archived rows are excluded when lifecycle columns exist.
 */
export async function getCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured()) return SEED_CATEGORIES;
  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });
    query = query.eq("is_deleted", false) as typeof query;
    query = query.is("archived_at", null) as typeof query;

    const { data, error } = await query;
    if (error) {
      if (isMissingTableError(error, "categories")) {
        console.warn("[getCategories] table missing — seed fallback");
        return SEED_CATEGORIES;
      }
      if (isLifecycleSchemaError(error)) {
        const retry = await supabase
          .from("categories")
          .select("*")
          .order("sort_order", { ascending: true });
        if (retry.error) {
          if (isMissingTableError(retry.error, "categories")) {
            console.warn("[getCategories] table missing — seed fallback");
            return SEED_CATEGORIES;
          }
          console.error("[getCategories]", retry.error);
          return SEED_CATEGORIES;
        }
        return filterLifecycleRows(
          ((retry.data as Category[]) ?? []).map(normalizeCategoryRow),
          "active"
        );
      }
      console.error("[getCategories]", error);
      return SEED_CATEGORIES;
    }
    return filterLifecycleRows(
      ((data as Category[]) ?? []).map(normalizeCategoryRow),
      "active"
    );
  } catch (e) {
    console.error("[getCategories]", e);
    return SEED_CATEGORIES;
  }
}

/** Visible storefront categories, sorted by sort_order (from query). */
export async function getVisibleCategories(): Promise<Category[]> {
  const all = await getCategories();
  return all.filter((c) => c.is_visible !== false);
}

/**
 * Storefront categories for Header / Footer / Homepage:
 * all published (is_visible) non-deleted categories from the DB.
 * Nav/homepage further filter via visible_in_navigation / show_on_homepage.
 * Empty collections are allowed so Admin-created categories appear immediately.
 */
export async function getStorefrontCategories(): Promise<Category[]> {
  return getVisibleCategories();
}

/** Homepage collections section — published + show_on_homepage. */
export async function getHomepageCategories(): Promise<Category[]> {
  const all = await getVisibleCategories();
  return all
    .filter(isHomepageCategory)
    .sort((a, b) => {
      const feat = Number(b.featured_collection) - Number(a.featured_collection);
      if (feat !== 0) return feat;
      return a.sort_order - b.sort_order || a.name_ar.localeCompare(b.name_ar, "ar");
    });
}

function normalizePublicPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/**
 * Resolve a storefront category by public slug or href path segment.
 * Matches Admin-created rows (slug only) and seeded rows (slug + href).
 */
export async function getCategoryBySlug(
  slugOrPath: string
): Promise<Category | null> {
  const raw = slugOrPath.trim();
  if (!raw) return null;
  const path = normalizePublicPath(raw);
  const slug = path.replace(/^\//, "").toLowerCase();
  if (!slug) return null;

  const all = await getCategories();
  const match = all.find((c) => {
    if (c.slug?.trim().toLowerCase() === slug) return true;
    if (c.legacy_key?.trim().toLowerCase() === slug) return true;
    const href = c.href?.trim();
    if (!href) return false;
    return normalizePublicPath(href).toLowerCase() === path.toLowerCase();
  });
  return match ?? null;
}

export async function getCategoryById(id: string): Promise<Category | null> {
  if (!id) return null;
  const all = await getCategories();
  return all.find((c) => c.id === id) ?? null;
}
