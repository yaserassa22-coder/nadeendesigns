import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createRouteHandlerClient } from "@/lib/supabase/route";
import { requireCustomerApi } from "@/lib/customer-auth/customer";
import {
  applyGuestCookie,
  ensureGuestCustomer,
} from "@/lib/guest";

/** Sign out current session, or all devices when ?all=1.
 *  Always mint a fresh guest session so shopping continues. */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    const guest = await ensureGuestCustomer({
      forceNew: true,
      userAgent: request.headers.get("user-agent"),
    });
    const res = NextResponse.json({ ok: true, guest_id: guest.guestId });
    return applyGuestCookie(res, guest.guestId, request.url);
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

      if (auth.user) {
        await admin.auth.admin.signOut(auth.user.id, "global");
      }
    } catch {
      // fall through to local signOut
    }
  }

  const { supabase, applyAuthCookies } = createRouteHandlerClient(request);
  await supabase.auth.signOut();

  const guest = await ensureGuestCustomer({
    forceNew: true,
    userAgent: request.headers.get("user-agent"),
  });
  const res = applyAuthCookies(
    NextResponse.json({ ok: true, guest_id: guest.guestId })
  );
  return applyGuestCookie(res, guest.guestId, request.url);
}
