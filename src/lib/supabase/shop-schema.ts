import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Returns false when veils / bridal_robes / shop_orders are missing. */
export async function isShopSchemaReady(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = createAdminClient();
  const { error } = await supabase.from("shop_orders").select("id").limit(1);
  if (!error) return true;
  if (isMissingTableError(error, "shop_orders")) return false;
  // Other errors (RLS empty, etc.) mean the table exists
  return true;
}
