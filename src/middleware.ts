import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isSupabaseConfigured, getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { createServerClient } from "@supabase/ssr";

const ADMIN_ROLES = new Set(["admin", "owner", "manager", "staff"]);

async function userHasAdminRole(
  request: NextRequest,
  response: NextResponse,
  userId: string
): Promise<boolean> {
  try {
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
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    const role = (data?.role as string | undefined)?.toLowerCase();
    return Boolean(role && ADMIN_ROLES.has(role));
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginRoute = pathname === "/admin/login";
  const isAuthCallback = pathname.startsWith("/api/auth/callback");
  const isAccountRoute = pathname.startsWith("/account");

  // Refresh session for account + auth callback + admin
  if (!isAdminRoute && !isAccountRoute && !isAuthCallback) {
    return NextResponse.next();
  }

  if (!isSupabaseConfigured()) {
    if (isAdminRoute && !isLoginRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("error", "config");
      return NextResponse.redirect(url);
    }
    if (isAccountRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("login", "1");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);

  if (isAdminRoute) {
    if (!user && !isLoginRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    if (user && !isLoginRoute) {
      const ok = await userHasAdminRole(request, response, user.id);
      if (!ok) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        url.searchParams.set("error", "admin_only");
        return NextResponse.redirect(url);
      }
    }

    if (user && isLoginRoute) {
      const ok = await userHasAdminRole(request, response, user.id);
      if (ok) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin";
        return NextResponse.redirect(url);
      }
      // Customer session on admin login page — allow form (don't bounce to /admin)
    }

    return response;
  }

  // Soft gate /account — redirect guests to home with login prompt
  if (isAccountRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("login", "1");
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/api/auth/callback"],
};
