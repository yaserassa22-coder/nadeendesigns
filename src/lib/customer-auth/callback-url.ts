import { getSiteUrl } from "@/lib/notifications/config";

/**
 * Canonical Supabase auth redirect target for this app.
 * Must match Authentication → URL Configuration → Redirect URLs.
 */
export function getAuthCallbackUrl(next = "/account"): string {
  const safe =
    next.startsWith("/") && !next.startsWith("//") ? next : "/account";
  return `${getSiteUrl()}/api/auth/callback?next=${encodeURIComponent(safe)}`;
}

/** Absolute path (no host) for relative redirects after session is established. */
export function safeAuthNextPath(
  next: string | null | undefined,
  fallback = "/account"
): string {
  const value = (next || fallback).trim();
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return fallback;
}
