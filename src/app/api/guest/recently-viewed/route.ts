import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/errors";
import { getCustomerByAuthUserId } from "@/lib/customer-auth/customer";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  applyGuestCookie,
  ensureGuestCustomer,
  guestRateKey,
  rateLimitGuest,
  readGuestIdFromRequest,
} from "@/lib/guest";

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const limited = rateLimitGuest(guestRateKey("views-get", ip), 90, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "محاولات كثيرة" }, { status: 429 });
  }

  const limit = Math.min(
    40,
    Math.max(1, Number(new URL(request.url).searchParams.get("limit") || 12))
  );

  const user = await getAuthenticatedUser().catch(() => null);
  const supabase = createAdminClient();
  let guestId: string | null = null;

  let query = supabase
    .from("recently_viewed")
    .select("*")
    .order("viewed_at", { ascending: false })
    .limit(limit);

  if (user) {
    const customer = await getCustomerByAuthUserId(user.id);
    if (customer) {
      query = query.eq("customer_id", customer.id);
    } else {
      const ensured = await ensureGuestCustomer({
        guestId: readGuestIdFromRequest(request),
        userAgent: request.headers.get("user-agent"),
      });
      guestId = ensured.guestId;
      query = query.eq("guest_id", guestId);
    }
  } else {
    const ensured = await ensureGuestCustomer({
      guestId: readGuestIdFromRequest(request),
      userAgent: request.headers.get("user-agent"),
    });
    guestId = ensured.guestId;
    query = query.eq("guest_id", guestId);
  }

  const { data, error } = await query;
  if (error && isMissingTableError(error, "recently_viewed")) {
    const res = NextResponse.json({ items: [], stub: true });
    if (guestId) applyGuestCookie(res, guestId, request.url);
    return res;
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const res = NextResponse.json({ items: data ?? [] });
  if (guestId) applyGuestCookie(res, guestId, request.url);
  return res;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const limited = rateLimitGuest(guestRateKey("views-post", ip), 60, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "محاولات كثيرة" }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    product_kind?: string;
    product_id?: string;
    product_slug?: string;
    product_title?: string;
    product_image_url?: string;
  };
  if (!body.product_id) {
    return NextResponse.json({ error: "product_id مطلوب" }, { status: 400 });
  }

  const user = await getAuthenticatedUser().catch(() => null);
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  let guestId: string | null = null;

  const row: Record<string, unknown> = {
    product_kind: body.product_kind || "dress",
    product_id: body.product_id,
    product_slug: body.product_slug ?? null,
    product_title: body.product_title ?? null,
    product_image_url: body.product_image_url ?? null,
    viewed_at: now,
  };

  if (user) {
    const customer = await getCustomerByAuthUserId(user.id);
    if (customer) {
      row.customer_id = customer.id;
      row.guest_id = null;
      // Replace prior view of same product for this customer
      await supabase
        .from("recently_viewed")
        .delete()
        .eq("customer_id", customer.id)
        .eq("product_id", body.product_id)
        .eq("product_kind", row.product_kind as string);
    } else {
      const ensured = await ensureGuestCustomer({
        guestId: readGuestIdFromRequest(request),
        userAgent: request.headers.get("user-agent"),
      });
      guestId = ensured.guestId;
      row.guest_id = guestId;
      row.customer_id = null;
      await supabase
        .from("recently_viewed")
        .delete()
        .eq("guest_id", guestId)
        .eq("product_id", body.product_id)
        .eq("product_kind", row.product_kind as string);
    }
  } else {
    const ensured = await ensureGuestCustomer({
      guestId: readGuestIdFromRequest(request),
      userAgent: request.headers.get("user-agent"),
    });
    guestId = ensured.guestId;
    row.guest_id = guestId;
    row.customer_id = null;
    await supabase
      .from("recently_viewed")
      .delete()
      .eq("guest_id", guestId)
      .eq("product_id", body.product_id)
      .eq("product_kind", row.product_kind as string);
  }

  const { data, error } = await supabase
    .from("recently_viewed")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    if (isMissingTableError(error, "recently_viewed")) {
      return NextResponse.json({ ok: true, stub: true });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const res = NextResponse.json({ item: data });
  if (guestId) applyGuestCookie(res, guestId, request.url);
  return res;
}
