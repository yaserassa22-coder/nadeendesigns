import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

type BufferedCookie = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

/**
 * Supabase client for Route Handlers that buffers Set-Cookie onto the
 * returned NextResponse. Using only cookies() from next/headers can drop
 * session cookies when returning NextResponse.json() — login appears to
 * succeed but no session is stored; logout appears to do nothing.
 */
export function createRouteHandlerClient(request: NextRequest) {
  const pending: BufferedCookie[] = [];

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        pending.length = 0;
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          pending.push({ name, value, options });
        }
      },
    },
  });

  function applyAuthCookies<T extends NextResponse>(response: T): T {
    for (const { name, value, options } of pending) {
      response.cookies.set(name, value, options);
    }
    return response;
  }

  return { supabase, applyAuthCookies };
}
