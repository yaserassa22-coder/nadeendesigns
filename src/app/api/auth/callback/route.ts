import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSiteUrl } from "@/lib/notifications/config";
import {
  recordCustomerSession,
  recordLoginHistory,
  upsertCustomerForAuthUser,
} from "@/lib/customer-auth/customer";
import {
  applyGuestCookie,
  readGuestIdFromRequest,
} from "@/lib/guest";

/**
 * OAuth / magic-link callback — exchanges code for session cookies.
 * Merges guest_id cookie data into the registered customer.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/account";
  const errorParam = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");

  if (errorParam) {
    const url = new URL("/", origin);
    url.searchParams.set("login", "1");
    url.searchParams.set("error", errorDesc || errorParam);
    return NextResponse.redirect(url);
  }

  if (!code || !isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/?login=1", origin));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    const url = new URL("/", origin);
    url.searchParams.set("login", "1");
    url.searchParams.set("error", error?.message || "oauth_failed");
    return NextResponse.redirect(url);
  }

  const user = data.user;
  // Opaque provider id string for admin display — no business branching on it.
  const providerId =
    (user.app_metadata?.provider as string | undefined) ||
    (user.user_metadata?.provider as string | undefined) ||
    "oauth";

  const guestId = readGuestIdFromRequest(request);

  const customer = await upsertCustomerForAuthUser({
    authUserId: user.id,
    email: user.email,
    phone: user.phone,
    fullName:
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      "",
    photoUrl:
      (user.user_metadata?.avatar_url as string | undefined) ||
      (user.user_metadata?.picture as string | undefined) ||
      null,
    provider: providerId,
    guestId,
  });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const ua = request.headers.get("user-agent");
  const provider = providerId;

  if (customer) {
    await recordLoginHistory({
      customerId: customer.id,
      authUserId: user.id,
      method: provider,
      success: true,
      ip,
      userAgent: ua,
    });
    await recordCustomerSession({
      customerId: customer.id,
      authUserId: user.id,
      ip,
      userAgent: ua,
    });
  }

  // Avoid open redirects
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/account";
  const site = getSiteUrl();
  const redirectTo = site
    ? `${site}${safeNext}`
    : new URL(safeNext, origin).toString();
  const response = NextResponse.redirect(redirectTo);
  // Keep guest cookie until client cart take; do not clear yet
  if (guestId) {
    applyGuestCookie(response, guestId, request.url);
  }
  return response;
}
