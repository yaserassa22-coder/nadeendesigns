import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  applyGuestCookie,
  ensureGuestCustomer,
  guestRateKey,
  rateLimitGuest,
  readGuestIdFromRequest,
  takeGuestCartItems,
} from "@/lib/guest";
import { sanitizeGuestCartItems } from "@/lib/guest/cart-items";

function guestSessionUnavailableResponse(
  guestId: string,
  requestUrl: string,
  detail?: string
) {
  const res = NextResponse.json(
    {
      error:
        detail ||
        "تعذر إنشاء جلسة الضيف. طبّقي ترحيل 031 ثم 032 (APPLY_GUEST_STOREFRONT_RLS) أو APPLY_ALL قسم 35.",
    },
    { status: 503 }
  );
  return applyGuestCookie(res, guestId, requestUrl);
}

function mapCartWriteError(message: string): { status: number; error: string } {
  if (/foreign key|violates foreign key/i.test(message)) {
    return {
      status: 503,
      error:
        "جلسة الضيف غير محفوظة (FK guest_carts → guest_customers). أعيدي المحاولة أو طبّقي ترحيل 031/032.",
    };
  }
  if (/row-level security|RLS/i.test(message)) {
    return {
      status: 503,
      error:
        "تم رفض كتابة سلة الضيف بسبب RLS. طبّقي ترحيل 032 / APPLY_GUEST_STOREFRONT_RLS.",
    };
  }
  return { status: 400, error: message };
}

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
    const items = ensured.persisted
      ? await takeGuestCartItems(ensured.guestId)
      : [];
    const res = NextResponse.json({ items, guest_id: ensured.guestId });
    return applyGuestCookie(res, ensured.guestId, request.url);
  }

  if (!isSupabaseConfigured()) {
    const res = NextResponse.json({
      items: [],
      guest_id: ensured.guestId,
      stub: true,
    });
    return applyGuestCookie(res, ensured.guestId, request.url);
  }

  if (!ensured.persisted) {
    // Still set cookie so subsequent requests reuse the same guest_id.
    const res = NextResponse.json({
      items: [],
      guest_id: ensured.guestId,
      stub: true,
    });
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
    const res = NextResponse.json({ error: error.message }, { status: 400 });
    return applyGuestCookie(res, ensured.guestId, request.url);
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
  if (body.items.length > 50) {
    return NextResponse.json(
      { error: "السلة كبيرة جداً" },
      { status: 400 }
    );
  }

  const items = sanitizeGuestCartItems(body.items);
  if (body.items.length > 0 && items.length === 0) {
    return NextResponse.json(
      { error: "عناصر السلة غير صالحة" },
      { status: 400 }
    );
  }

  const existing = readGuestIdFromRequest(request);
  const ensured = await ensureGuestCustomer({
    guestId: existing,
    userAgent: request.headers.get("user-agent"),
  });

  if (!isSupabaseConfigured()) {
    const res = NextResponse.json({
      ok: true,
      guest_id: ensured.guestId,
      stub: true,
    });
    return applyGuestCookie(res, ensured.guestId, request.url);
  }

  // Root cause of prior PUT 400: upsert into guest_carts while guest_customers
  // row was missing (ensureGuestCustomer swallowed RLS/write failures).
  if (!ensured.persisted) {
    return guestSessionUnavailableResponse(ensured.guestId, request.url);
  }

  const now = new Date().toISOString();
  const supabase = createAdminClient();
  const { error } = await supabase.from("guest_carts").upsert(
    {
      guest_id: ensured.guestId,
      items,
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
    const mapped = mapCartWriteError(error.message);
    const res = NextResponse.json(
      { error: mapped.error },
      { status: mapped.status }
    );
    return applyGuestCookie(res, ensured.guestId, request.url);
  }

  const res = NextResponse.json({ ok: true, guest_id: ensured.guestId });
  return applyGuestCookie(res, ensured.guestId, request.url);
}
