import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSiteUrl } from "@/lib/notifications/config";
import {
  recordCustomerSession,
  recordLoginHistory,
  upsertCustomerForAuthUser,
} from "@/lib/customer-auth/customer";

/**
 * OAuth / magic-link callback — exchanges code for session cookies.
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
  const oauthProvider =
    (user.app_metadata?.provider as string | undefined) || "oauth";
  const mappedProvider =
    oauthProvider === "google" || oauthProvider === "apple"
      ? oauthProvider
      : oauthProvider;

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
    provider: mappedProvider,
  });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const ua = request.headers.get("user-agent");
  const provider = mappedProvider;

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
  const redirectTo = site ? `${site}${safeNext}` : new URL(safeNext, origin).toString();
  return NextResponse.redirect(redirectTo);
}
