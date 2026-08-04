import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  GUEST_COOKIE_MAX_AGE,
  GUEST_COOKIE_NAME,
} from "./constants";
import { generateGuestId, isValidGuestId, normalizeGuestId } from "./id";

export type GuestRow = {
  id: string;
  guest_id: string;
  created_at: string;
  last_seen: string;
  language: string | null;
  country: string | null;
  device: string | null;
  converted_to_customer_id: string | null;
};

export function guestCookieOptions(secure: boolean) {
  return {
    name: GUEST_COOKIE_NAME,
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: GUEST_COOKIE_MAX_AGE,
  };
}

export function applyGuestCookie(
  response: NextResponse,
  guestId: string,
  requestUrl?: string
) {
  const secure =
    requestUrl?.startsWith("https") ||
    process.env.NODE_ENV === "production";
  response.cookies.set({
    ...guestCookieOptions(secure),
    value: guestId,
  });
  return response;
}

export function clearGuestCookie(response: NextResponse) {
  response.cookies.set({
    name: GUEST_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export function readGuestIdFromRequest(request: NextRequest): string | null {
  const raw = request.cookies.get(GUEST_COOKIE_NAME)?.value;
  return normalizeGuestId(raw);
}

export async function readGuestIdFromCookies(): Promise<string | null> {
  try {
    const jar = await cookies();
    return normalizeGuestId(jar.get(GUEST_COOKIE_NAME)?.value);
  } catch {
    return null;
  }
}

function deviceHint(ua: string | null): string | null {
  if (!ua) return null;
  const s = ua.slice(0, 180);
  if (/Mobile|Android|iPhone/i.test(ua)) return `mobile:${s}`;
  if (/iPad|Tablet/i.test(ua)) return `tablet:${s}`;
  return `desktop:${s}`;
}

export type EnsureGuestResult = {
  guestId: string;
  created: boolean;
  row: GuestRow | null;
  /** True when guest_customers row exists (required FK parent for guest_carts). */
  persisted: boolean;
};

/**
 * Ensure a guest_customers row exists for the cookie guest_id.
 * Creates a new cryptographically secure UUID when missing/invalid.
 * Updates last_seen on every call.
 *
 * guest_carts.guest_id REFERENCES guest_customers(guest_id) — callers must
 * check `persisted` before writing dependent rows, or upserts return FK 400.
 */
export async function ensureGuestCustomer(params: {
  guestId?: string | null;
  language?: string | null;
  country?: string | null;
  userAgent?: string | null;
  /** Force a brand-new guest session (e.g. after registered logout). */
  forceNew?: boolean;
}): Promise<EnsureGuestResult> {
  const existing =
    !params.forceNew && isValidGuestId(params.guestId)
      ? params.guestId!.trim().toLowerCase()
      : null;
  // Always lowercase so cookie + FK keys stay consistent.
  const guestId = (existing ?? generateGuestId()).toLowerCase();
  const created = !existing;
  const now = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    return { guestId, created, row: null, persisted: false };
  }

  const supabase = createAdminClient();
  const device = deviceHint(params.userAgent ?? null);

  if (!created) {
    const { data, error } = await supabase
      .from("guest_customers")
      .update({
        last_seen: now,
        language: params.language || "ar",
        ...(params.country ? { country: params.country } : {}),
        ...(device ? { device } : {}),
      })
      .eq("guest_id", guestId)
      .select("*")
      .maybeSingle();

    if (!error && data) {
      return { guestId, created: false, row: data as GuestRow, persisted: true };
    }

    // Cookie existed but row missing — recreate below
    if (error && isMissingTableError(error, "guest_customers")) {
      return { guestId, created: true, row: null, persisted: false };
    }
  }

  const insert = {
    guest_id: guestId,
    created_at: now,
    last_seen: now,
    language: params.language || "ar",
    country: params.country ?? null,
    device,
  };

  const { data, error } = await supabase
    .from("guest_customers")
    .upsert(insert, { onConflict: "guest_id" })
    .select("*")
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error, "guest_customers")) {
      console.warn(
        "[guest] guest_customers missing — apply migration 031 / APPLY_GUEST_CUSTOMERS"
      );
      return { guestId, created: true, row: null, persisted: false };
    }
    // Typical when anon key is used without SERVICE_ROLE (RLS blocks write).
    console.warn("[guest] ensureGuestCustomer", error.message);
    return { guestId, created: true, row: null, persisted: false };
  }

  if (!data) {
    const { data: again, error: readError } = await supabase
      .from("guest_customers")
      .select("*")
      .eq("guest_id", guestId)
      .maybeSingle();
    if (!readError && again) {
      return {
        guestId,
        created: created || !existing,
        row: again as GuestRow,
        persisted: true,
      };
    }
    console.warn(
      "[guest] ensureGuestCustomer upsert returned no row",
      readError?.message
    );
    return { guestId, created: true, row: null, persisted: false };
  }

  return {
    guestId,
    created: created || !existing,
    row: data as GuestRow,
    persisted: true,
  };
}

export async function markGuestConverted(
  guestId: string,
  customerId: string
): Promise<void> {
  if (!isSupabaseConfigured() || !isValidGuestId(guestId)) return;
  try {
    const supabase = createAdminClient();
    await supabase
      .from("guest_customers")
      .update({
        converted_to_customer_id: customerId,
        last_seen: new Date().toISOString(),
      })
      .eq("guest_id", guestId.trim().toLowerCase())
      .is("converted_to_customer_id", null);
  } catch {
    /* non-fatal */
  }
}
