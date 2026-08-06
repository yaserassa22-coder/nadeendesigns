import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createRouteHandlerClient } from "@/lib/supabase/route";
import { safeAuthNextPath } from "@/lib/customer-auth/callback-url";
import {
  recordCustomerSession,
  recordLoginHistory,
  upsertCustomerForAuthUser,
} from "@/lib/customer-auth/customer";
import {
  applyGuestCookie,
  readGuestIdFromRequest,
} from "@/lib/guest";

const OTP_TYPES = new Set<string>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function loginErrorRedirect(origin: string, error: string) {
  const url = new URL("/", origin);
  url.searchParams.set("login", "1");
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

/**
 * OAuth / email-confirm / magic-link / password-recovery callback.
 * Exchanges `code` (PKCE) or verifies `token_hash`+`type`, then sets session
 * cookies on the redirect response.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const typeRaw = searchParams.get("type");
  const type =
    typeRaw && OTP_TYPES.has(typeRaw) ? (typeRaw as EmailOtpType) : null;
  const next = safeAuthNextPath(searchParams.get("next"), "/account");
  const errorParam = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");

  if (errorParam) {
    return loginErrorRedirect(origin, errorDesc || errorParam);
  }

  if (!isSupabaseConfigured()) {
    return loginErrorRedirect(origin, "auth_not_configured");
  }

  if (!code && !(tokenHash && type)) {
    // Email/recovery links that hit Site URL `/` never reach here. When they
    // do reach the callback without params, surface a real error — do not
    // silently look like a successful home visit.
    return loginErrorRedirect(origin, "missing_code_or_token");
  }

  // Must buffer Set-Cookie onto the redirect response. Using cookies() from
  // next/headers alone drops the session when returning NextResponse.redirect.
  const { supabase, applyAuthCookies } = createRouteHandlerClient(request);

  let user: { id: string; email?: string | null; phone?: string | null; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } | null =
    null;
  let authError: { message: string } | null = null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    authError = error;
    user = data.user;
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    authError = error;
    user = data.user;
  }

  if (authError || !user) {
    return loginErrorRedirect(
      origin,
      authError?.message || "auth_exchange_failed"
    );
  }

  // Opaque provider id string for admin display — no business branching on it.
  const providerId =
    (user.app_metadata?.provider as string | undefined) ||
    (user.user_metadata?.provider as string | undefined) ||
    (type === "recovery" ? "recovery" : type === "signup" ? "email" : "oauth");

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

  if (customer) {
    await recordLoginHistory({
      customerId: customer.id,
      authUserId: user.id,
      method: providerId,
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

  // Recovery → reset-password page; otherwise honor `next`.
  const destination =
    type === "recovery"
      ? safeAuthNextPath(searchParams.get("next"), "/account/reset-password")
      : next;

  // Redirect on the same origin that served the callback so session cookies
  // stay on this host (do NOT bounce through a different NEXT_PUBLIC_SITE_URL).
  const redirectTo = new URL(destination, origin).toString();
  const response = applyAuthCookies(NextResponse.redirect(redirectTo));

  if (guestId) {
    applyGuestCookie(response, guestId, request.url);
  }
  return response;
}
