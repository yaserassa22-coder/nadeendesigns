import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

/** Prefer service role for privileged writes; fall back to anon key. */
export function createAdminClient() {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? getSupabaseAnonKey();

  return createClient(getSupabaseUrl(), key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
