import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireCustomerApi } from "@/lib/customer-auth/customer";

/** Sign out current session, or all devices when ?all=1 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true });
  }

  const all = new URL(request.url).searchParams.get("all") === "1";
  const auth = await requireCustomerApi();

  if (all && !auth.error && auth.customer) {
    try {
      const admin = createAdminClient();
      await admin
        .from("customer_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("customer_id", auth.customer.id)
        .is("revoked_at", null);

      // Invalidate Supabase refresh tokens for this user
      if (auth.user) {
        await admin.auth.admin.signOut(auth.user.id, "global");
      }
    } catch {
      // fall through to local signOut
    }
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
