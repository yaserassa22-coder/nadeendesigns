import { SEED_CATEGORIES, type Category } from "@/types/category";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Public categories for storefront nav/homepage.
 * Uses the anon/service client (no cookies) so layout can stay cache-friendly.
 */
export async function getCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured()) return SEED_CATEGORIES;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      if (isMissingTableError(error, "categories")) {
        console.warn("[getCategories] table missing — seed fallback");
        return SEED_CATEGORIES;
      }
      console.error("[getCategories]", error);
      return SEED_CATEGORIES;
    }
    return (data as Category[]) ?? SEED_CATEGORIES;
  } catch (e) {
    console.error("[getCategories]", e);
    return SEED_CATEGORIES;
  }
}

export async function getVisibleCategories(): Promise<Category[]> {
  const all = await getCategories();
  return all.filter((c) => c.is_visible);
}
