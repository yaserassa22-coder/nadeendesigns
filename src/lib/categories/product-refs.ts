import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Category } from "@/types/category";

/**
 * Count active dresses referencing a category by category_id or legacy TEXT.
 */
export async function countDressesForCategory(
  category: Pick<Category, "id" | "legacy_key" | "slug">
): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = await createPrivilegedClient();

  const { count: byId, error: idError } = await supabase
    .from("dresses")
    .select("id", { count: "exact", head: true })
    .eq("category_id", category.id)
    .eq("is_deleted", false);

  let idCount = 0;
  if (
    idError &&
    /category_id|is_deleted|PGRST204|42703/i.test(
      `${idError.message}${idError.code}`
    )
  ) {
    // column missing — fall through to TEXT only
  } else if (idError) {
    console.error("[countDressesForCategory] by id", idError);
  } else {
    idCount = byId ?? 0;
  }

  const textKeys = [category.legacy_key, category.slug].filter(
    (k): k is string => Boolean(k?.trim())
  );
  if (textKeys.length === 0) return idCount;

  let textQuery = supabase
    .from("dresses")
    .select("id", { count: "exact", head: true })
    .in("category", textKeys)
    .is("category_id", null);

  textQuery = textQuery.eq("is_deleted", false) as typeof textQuery;

  let { count: byText, error: textError } = await textQuery;
  if (
    textError &&
    /is_deleted|category_id|PGRST204|42703/i.test(
      `${textError.message}${textError.code}`
    )
  ) {
    const retry = await supabase
      .from("dresses")
      .select("id", { count: "exact", head: true })
      .in("category", textKeys);
    byText = retry.count;
    textError = retry.error;
  }
  if (textError) {
    console.error("[countDressesForCategory] by text", textError);
    return idCount;
  }

  return idCount + (byText ?? 0);
}
