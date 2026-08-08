import { createClient } from "@supabase/supabase-js";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

type Cache = { at: number; on: boolean };
let cache: Cache | null = null;
const CACHE_MS = 3_000;

function parseStoreValue(raw: unknown): {
  security?: { maintenance_mode?: boolean };
} | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as { security?: { maintenance_mode?: boolean } };
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") {
    return raw as { security?: { maintenance_mode?: boolean } };
  }
  return null;
}

async function fetchMaintenanceFlag(apiKey: string): Promise<boolean | null> {
  const client = createClient(getSupabaseUrl(), apiKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client
    .from("settings")
    .select("value")
    .eq("key", "store")
    .maybeSingle();
  if (error) {
    console.warn("[maintenance] settings read failed:", error.message);
    return null;
  }
  const value = parseStoreValue(data?.value);
  return Boolean(value?.security?.maintenance_mode);
}

/**
 * Edge-safe maintenance flag (short TTL).
 * Returns false only when we successfully read "off", or when Supabase is not configured.
 * On read failure, keeps previous cache if present; otherwise false (cannot lock the shop forever on outage).
 */
export async function readMaintenanceMode(): Promise<boolean> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache.on;

  if (!isSupabaseConfigured()) {
    cache = { at: now, on: false };
    return false;
  }

  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    let result: boolean | null = null;
    if (serviceKey) {
      result = await fetchMaintenanceFlag(serviceKey);
    }
    if (result === null) {
      result = await fetchMaintenanceFlag(getSupabaseAnonKey());
    }
    if (result === null) {
      // Keep last known value briefly so a blip doesn't clear an active lock.
      if (cache) {
        cache = { at: now, on: cache.on };
        return cache.on;
      }
      return false;
    }
    cache = { at: now, on: result };
    return result;
  } catch (err) {
    console.warn(
      "[maintenance] read error",
      err instanceof Error ? err.message : err
    );
    if (cache) return cache.on;
    return false;
  }
}

/** Call after admin saves security so middleware picks up the new flag quickly. */
export function bustMaintenanceModeCache() {
  cache = null;
}

export function isMaintenanceExemptPath(pathname: string): boolean {
  if (pathname === "/maintenance") return true;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  if (pathname.startsWith("/api/admin")) return true;
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname === "/api/store-settings") return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") return true;
  if (/\.(?:png|jpe?g|gif|webp|svg|ico|woff2?|css|js|map)$/i.test(pathname)) {
    return true;
  }
  return false;
}
