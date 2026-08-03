import { SEED_CATEGORIES, type Category } from "@/types/category";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isMissingTableError } from "@/lib/supabase/errors";

export async function getAdminCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured()) return SEED_CATEGORIES;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    if (isMissingTableError(error, "categories")) {
      console.warn("[getAdminCategories] table missing — seed fallback");
      return SEED_CATEGORIES;
    }
    console.error("[getAdminCategories]", error);
    return SEED_CATEGORIES;
  }
  return (data as Category[]) ?? SEED_CATEGORIES;
}
