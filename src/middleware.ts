import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { updateSession } from "@/lib/supabase/middleware";
import {
  isSupabaseConfigured,
  getSupabaseAnonKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";
import { ADMIN_ROLES, isAdminRole } from "@/lib/auth/roles";

/**
 * Resolve profiles.role for the signed-in user.
 * Prefer service role so RLS cannot hide a real admin row in Edge middleware.
 * Fall back to the user-scoped anon client (auth.uid() = id policy).
 */
async function userHasAdminRole(
  request: NextRequest,
  response: NextResponse,
  userId: string
): Promise<boolean> {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) {
      const admin = createClient(getSupabaseUrl(), serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await admin
        .from("profiles")
        .select("role, is_disabled")
        .eq("id", userId)
        .maybeSingle();
      if (error) {
        // Pre-migration: column may be missing — fall through to role-only.
        if (!/is_disabled/i.test(error.message)) {
          console.warn("[middleware] profile role (service)", error.message);
        } else {
          const basic = await admin
            .from("profiles")
            .select("role")
            .eq("id", userId)
            .maybeSingle();
          if (!basic.error) {
            return isAdminRole(basic.data?.role as string | undefined);
          }
        }
      } else {
        if (data?.is_disabled) return false;
        return isAdminRole(data?.role as string | undefined);
      }
    }

    const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });
    const { data, error } = await supabase
      .from("profiles")
      .select("role, is_disabled")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      if (/is_disabled/i.test(error.message)) {
        const basic = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();
        if (basic.error) return false;
        return isAdminRole(basic.data?.role as string | undefined);
      }
      console.warn("[middleware] profile role (session)", error.message);
      return false;
    }
    if (data?.is_disabled) return false;
    const role = (data?.role as string | undefined)?.toLowerCase();
    return Boolean(role && ADMIN_ROLES.has(role));
  } catch (err) {
    console.warn(
      "[middleware] profile role failed",
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

function redirectWithCookies(
  request: NextRequest,
  sessionResponse: NextResponse,
  pathname: string,
  params?: Record<string, string>
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  const redirectResponse = NextResponse.redirect(url);
  // Preserve session-refresh Set-Cookie headers from updateSession
  const setCookies =
    typeof sessionResponse.headers.getSetCookie === "function"
      ? sessionResponse.headers.getSetCookie()
      : [];
  for (const cookie of setCookies) {
    redirectResponse.headers.append("Set-Cookie", cookie);
  }
  return redirectResponse;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isLoginRoute = pathname === "/admin/login";
  const isAuthCallback = pathname.startsWith("/api/auth/callback");
  const isAccountRoute =
    pathname === "/account" || pathname.startsWith("/account/");

  // Refresh session for account + auth callback + admin
  if (!isAdminRoute && !isAccountRoute && !isAuthCallback) {
    return NextResponse.next();
  }

  if (!isSupabaseConfigured()) {
    if (isAdminRoute && !isLoginRoute) {
      return redirectWithCookies(
        request,
        NextResponse.next({ request }),
        "/admin/login",
        { error: "config" }
      );
    }
    if (isAccountRoute) {
      return redirectWithCookies(
        request,
        NextResponse.next({ request }),
        "/",
        { login: "1" }
      );
    }
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);

  if (isAdminRoute) {
    if (!user && !isLoginRoute) {
      return redirectWithCookies(request, response, "/admin/login", {
        redirect: pathname,
      });
    }

    if (user && !isLoginRoute) {
      const ok = await userHasAdminRole(request, response, user.id);
      if (!ok) {
        // Customer / non-admin session — send to admin login (not homepage)
        return redirectWithCookies(request, response, "/admin/login", {
          error: "admin_only",
          redirect: pathname,
        });
      }
    }

    if (user && isLoginRoute) {
      const ok = await userHasAdminRole(request, response, user.id);
      if (ok) {
        return redirectWithCookies(request, response, "/admin");
      }
      // Customer session on admin login page — allow form (don't bounce to /admin)
    }

    return response;
  }

  // Soft gate /account — redirect guests to home with login prompt
  if (isAccountRoute && !user) {
    return redirectWithCookies(request, response, "/", {
      login: "1",
      redirect: pathname,
    });
  }

  return response;
}

export const config = {
  // Include bare /admin and /account — `:path*` alone can miss the root segment
  matcher: [
    "/admin",
    "/admin/:path*",
    "/account",
    "/account/:path*",
    "/api/auth/callback",
  ],
};
