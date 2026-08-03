import { SEED_CATEGORIES, type Category } from "@/types/category";
import {
  filterLifecycleRows,
  isLifecycleSchemaError,
} from "@/lib/admin/query-lifecycle";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isMissingTableError } from "@/lib/supabase/errors";

export async function getAdminCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured()) return SEED_CATEGORIES;
  const supabase = createAdminClient();
  let query = supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  query = query.eq("is_deleted", false) as typeof query;
  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error, "categories")) {
      console.warn("[getAdminCategories] table missing — seed fallback");
      return SEED_CATEGORIES;
    }
    if (isLifecycleSchemaError(error)) {
      const retry = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (retry.error) {
        console.error("[getAdminCategories]", retry.error);
        return SEED_CATEGORIES;
      }
      return (retry.data as Category[]) ?? SEED_CATEGORIES;
    }
    console.error("[getAdminCategories]", error);
    return SEED_CATEGORIES;
  }
  return filterLifecycleRows((data as Category[]) ?? [], "all");
}
