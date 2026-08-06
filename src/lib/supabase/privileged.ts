import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function hasServiceRoleKey() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

/**
 * After requireAdminApi(), use service role if available;
 * otherwise the authenticated user session (RLS admin policies).
 *
 * contact_messages has INSERT-only public RLS — anon SELECT always returns [].
 * Prefer SERVICE_ROLE so Admin Messages never silently goes empty.
 */
export async function createPrivilegedClient() {
  if (hasServiceRoleKey()) {
    return createAdminClient();
  }
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "[createPrivilegedClient] SUPABASE_SERVICE_ROLE_KEY missing — falling back to cookie session. Admin contact_messages SELECT may return [] under RLS."
    );
  }
  return createClient();
}

export function isPrivilegedServiceRoleAvailable() {
  return hasServiceRoleKey();
}
