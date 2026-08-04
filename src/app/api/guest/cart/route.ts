import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  applyGuestCookie,
  ensureGuestCustomer,
  guestRateKey,
  rateLimitGuest,
  readGuestIdFromRequest,
  takeGuestCartItems,
} from "@/lib/guest";

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const limited = rateLimitGuest(guestRateKey("cart-get", ip), 90, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "محاولات كثيرة" }, { status: 429 });
  }

  const take = new URL(request.url).searchParams.get("take") === "1";
  const existing = readGuestIdFromRequest(request);
  const ensured = await ensureGuestCustomer({
    guestId: existing,
    userAgent: request.headers.get("user-agent"),
  });

  if (take) {
    const items = await takeGuestCartItems(ensured.guestId);
    const res = NextResponse.json({ items, guest_id: ensured.guestId });
    return applyGuestCookie(res, ensured.guestId, request.url);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("guest_carts")
    .select("items, updated_at")
    .eq("guest_id", ensured.guestId)
    .maybeSingle();

  if (error && isMissingTableError(error, "guest_carts")) {
    const res = NextResponse.json({ items: [], stub: true });
    return applyGuestCookie(res, ensured.guestId, request.url);
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const items = Array.isArray(data?.items) ? data!.items : [];
  const res = NextResponse.json({
    items,
    updated_at: data?.updated_at ?? null,
    guest_id: ensured.guestId,
  });
  return applyGuestCookie(res, ensured.guestId, request.url);
}

export async function PUT(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const limited = rateLimitGuest(guestRateKey("cart-put", ip), 60, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "محاولات كثيرة" },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    items?: unknown;
  };
  if (!Array.isArray(body.items)) {
    return NextResponse.json({ error: "items مطلوب" }, { status: 400 });
  }
  // Cap payload size
  if (body.items.length > 50) {
    return NextResponse.json(
      { error: "السلة كبيرة جداً" },
      { status: 400 }
    );
  }

  const existing = readGuestIdFromRequest(request);
  const ensured = await ensureGuestCustomer({
    guestId: existing,
    userAgent: request.headers.get("user-agent"),
  });

  const now = new Date().toISOString();
  const supabase = createAdminClient();
  const { error } = await supabase.from("guest_carts").upsert(
    {
      guest_id: ensured.guestId,
      items: body.items,
      updated_at: now,
    },
    { onConflict: "guest_id" }
  );

  if (error) {
    if (isMissingTableError(error, "guest_carts")) {
      return NextResponse.json(
        { error: "سلة الضيوف غير جاهزة — طبّقي ترحيل 031" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true, guest_id: ensured.guestId });
  return applyGuestCookie(res, ensured.guestId, request.url);
}
