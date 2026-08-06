import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

/**
 * Server Supabase client. Prefers SERVICE_ROLE (bypasses RLS) when set;
 * otherwise uses the anon key and relies on RLS policies.
 *
 * WARNING: Without SUPABASE_SERVICE_ROLE_KEY this is the anon key — it cannot
 * read admin-only tables (e.g. contact_messages SELECT returns []). For Admin
 * dashboard reads after auth, use createPrivilegedClient() instead.
 *
 * Guest cart/session durability must work on the anon fallback — see
 * migrations/032_guest_storefront_rls.sql (storefront guest policies).
 */
export function createAdminClient() {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || getSupabaseAnonKey();

  return createClient(getSupabaseUrl(), key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
