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
import {
  isMaintenanceExemptPath,
  readMaintenanceMode,
} from "@/lib/store/maintenance-edge";

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
  const needsSession =
    isAdminRoute || isAccountRoute || isAuthCallback;
  const maintenanceExempt = isMaintenanceExemptPath(pathname);

  // Always evaluate maintenance for non-exempt paths (no admin storefront bypass).
  const maintenanceOn = maintenanceExempt
    ? false
    : await readMaintenanceMode();

  if (maintenanceOn) {
    const passthrough = NextResponse.next({ request });
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Store is under maintenance", maintenance: true },
        { status: 503 }
      );
    }
    return redirectWithCookies(request, passthrough, "/maintenance");
  }

  if (!needsSession) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  let user: { id: string } | null = null;

  if (!isSupabaseConfigured()) {
    if (isAdminRoute && !isLoginRoute) {
      return redirectWithCookies(request, response, "/admin/login", {
        error: "config",
      });
    }
    if (isAccountRoute) {
      return redirectWithCookies(request, response, "/", { login: "1" });
    }
    return response;
  }

  const session = await updateSession(request);
  response = session.response;
  user = session.user;

  if (isAdminRoute) {
    if (!user && !isLoginRoute) {
      return redirectWithCookies(request, response, "/admin/login", {
        redirect: pathname,
      });
    }

    if (user && !isLoginRoute) {
      const ok = await userHasAdminRole(request, response, user.id);
      if (!ok) {
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
    }

    return response;
  }

  if (isAccountRoute && !user) {
    return redirectWithCookies(request, response, "/", {
      login: "1",
      redirect: pathname,
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
