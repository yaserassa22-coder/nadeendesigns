import { SEED_CATEGORIES, type Category } from "@/types/category";
import {
  filterLifecycleRows,
  isLifecycleSchemaError,
} from "@/lib/admin/query-lifecycle";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";

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
          (retry.data as Category[]) ?? [],
          "active"
        );
      }
      console.error("[getCategories]", error);
      return SEED_CATEGORIES;
    }
    return filterLifecycleRows((data as Category[]) ?? [], "active");
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
