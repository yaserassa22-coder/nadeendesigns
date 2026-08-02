import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * After requireAdminApi(), use service role if available;
 * otherwise the authenticated user session (RLS admin policies).
 */
export async function createPrivilegedClient() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createAdminClient();
  }
  return createClient();
}
