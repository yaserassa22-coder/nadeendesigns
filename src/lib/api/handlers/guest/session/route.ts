import { NextRequest, NextResponse } from "next/server";
import {
  applyGuestCookie,
  ensureGuestCustomer,
  guestRateKey,
  rateLimitGuest,
  readGuestIdFromRequest,
} from "@/lib/guest";

/**
 * Ensure guest session cookie + guest_customers row.
 * POST: create/refresh. GET: touch last_seen if cookie present (or create).
 */
export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const limited = rateLimitGuest(guestRateKey("session", ip), 60, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "محاولات كثيرة — حاولي لاحقاً" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    language?: string;
    country?: string;
    force_new?: boolean;
  };

  const existing = readGuestIdFromRequest(request);
  const result = await ensureGuestCustomer({
    guestId: body.force_new ? null : existing,
    forceNew: Boolean(body.force_new),
    language: body.language || "ar",
    country: body.country ?? null,
    userAgent: request.headers.get("user-agent"),
  });

  const res = NextResponse.json({
    guest_id: result.guestId,
    created: result.created,
    last_seen: result.row?.last_seen ?? null,
  });
  return applyGuestCookie(res, result.guestId, request.url);
}

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const limited = rateLimitGuest(guestRateKey("session-get", ip), 120, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "محاولات كثيرة" },
      { status: 429 }
    );
  }

  const existing = readGuestIdFromRequest(request);
  const result = await ensureGuestCustomer({
    guestId: existing,
    language: "ar",
    userAgent: request.headers.get("user-agent"),
  });

  const res = NextResponse.json({
    guest_id: result.guestId,
    created: result.created,
    last_seen: result.row?.last_seen ?? null,
  });
  return applyGuestCookie(res, result.guestId, request.url);
}
