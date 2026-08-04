import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/errors";
import { getCustomerByAuthUserId } from "@/lib/customer-auth/customer";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  ensureGuestCustomer,
  guestRateKey,
  rateLimitGuest,
  readGuestIdFromRequest,
  applyGuestCookie,
} from "@/lib/guest";

async function resolveOwner(request: NextRequest) {
  const user = await getAuthenticatedUser().catch(() => null);
  if (user) {
    const customer = await getCustomerByAuthUserId(user.id);
    if (customer) {
      return { kind: "customer" as const, customerId: customer.id, guestId: null };
    }
  }
  const existing = readGuestIdFromRequest(request);
  const ensured = await ensureGuestCustomer({
    guestId: existing,
    userAgent: request.headers.get("user-agent"),
  });
  return {
    kind: "guest" as const,
    customerId: null as string | null,
    guestId: ensured.guestId,
  };
}

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const limited = rateLimitGuest(guestRateKey("wishlist-get", ip), 90, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "محاولات كثيرة" }, { status: 429 });
  }

  const owner = await resolveOwner(request);
  const supabase = createAdminClient();
  let query = supabase
    .from("wishlist_items")
    .select("*")
    .order("created_at", { ascending: false });

  if (owner.kind === "customer") {
    query = query.eq("customer_id", owner.customerId!);
  } else {
    query = query.eq("guest_id", owner.guestId!);
  }

  const { data, error } = await query;
  if (error && isMissingTableError(error, "wishlist_items")) {
    const res = NextResponse.json({ items: [], stub: true });
    if (owner.guestId) applyGuestCookie(res, owner.guestId, request.url);
    return res;
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const res = NextResponse.json({ items: data ?? [], owner: owner.kind });
  if (owner.guestId) applyGuestCookie(res, owner.guestId, request.url);
  return res;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const limited = rateLimitGuest(guestRateKey("wishlist-post", ip), 40, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "محاولات كثيرة — حاولي لاحقاً" },
      { status: 429 }
    );
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

  const owner = await resolveOwner(request);
  const supabase = createAdminClient();

  const row: Record<string, unknown> = {
    product_kind: body.product_kind || "dress",
    product_id: body.product_id,
    product_slug: body.product_slug ?? null,
    product_title: body.product_title ?? null,
    product_image_url: body.product_image_url ?? null,
  };

  if (owner.kind === "customer") {
    row.customer_id = owner.customerId;
    row.guest_id = null;
  } else {
    row.guest_id = owner.guestId;
    row.customer_id = null;
  }

  // Prefer upsert; fall back to select+insert if unique index names differ
  let data = null;
  let error = null as { message: string } | null;

  if (owner.kind === "customer") {
    const result = await supabase
      .from("wishlist_items")
      .upsert(row, {
        onConflict: "customer_id,product_kind,product_id",
      })
      .select("*")
      .single();
    data = result.data;
    error = result.error;
  } else {
    const existing = await supabase
      .from("wishlist_items")
      .select("id")
      .eq("guest_id", owner.guestId!)
      .eq("product_kind", row.product_kind as string)
      .eq("product_id", body.product_id)
      .maybeSingle();

    if (existing.data?.id) {
      const result = await supabase
        .from("wishlist_items")
        .update(row)
        .eq("id", existing.data.id)
        .select("*")
        .single();
      data = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .from("wishlist_items")
        .insert(row)
        .select("*")
        .single();
      data = result.data;
      error = result.error;
    }
  }

  if (error) {
    if (isMissingTableError(error, "wishlist_items")) {
      return NextResponse.json(
        { error: "قائمة الأمنيات غير جاهزة — طبّقي ترحيل 031" },
        { status: 503 }
      );
    }
    // Fallback insert without onConflict if unique constraint name mismatch
    if (/on conflict|42P10|unique/i.test(error.message) && owner.kind === "customer") {
      const retry = await supabase
        .from("wishlist_items")
        .insert(row)
        .select("*")
        .single();
      if (!retry.error) {
        const res = NextResponse.json({
          item: retry.data,
          message: "❤️ تمت الإضافة إلى قائمة الأمنيات",
        });
        return res;
      }
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const res = NextResponse.json({
    item: data,
    message: "❤️ تمت الإضافة إلى قائمة الأمنيات",
    tip:
      owner.kind === "guest"
        ? "عند إنشاء حساب لاحقاً سنحتفظ بأمنياتكِ تلقائياً."
        : undefined,
  });
  if (owner.guestId) applyGuestCookie(res, owner.guestId, request.url);
  return res;
}

export async function DELETE(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const limited = rateLimitGuest(guestRateKey("wishlist-del", ip), 40, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "محاولات كثيرة" }, { status: 429 });
  }

  const id = new URL(request.url).searchParams.get("id");
  const productId = new URL(request.url).searchParams.get("product_id");
  const productKind =
    new URL(request.url).searchParams.get("product_kind") || "dress";

  if (!id && !productId) {
    return NextResponse.json(
      { error: "id أو product_id مطلوب" },
      { status: 400 }
    );
  }

  const owner = await resolveOwner(request);
  const supabase = createAdminClient();
  let query = supabase.from("wishlist_items").delete();

  if (id) {
    query = query.eq("id", id);
  } else {
    query = query
      .eq("product_id", productId!)
      .eq("product_kind", productKind);
  }

  if (owner.kind === "customer") {
    query = query.eq("customer_id", owner.customerId!);
  } else {
    query = query.eq("guest_id", owner.guestId!);
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  if (owner.guestId) applyGuestCookie(res, owner.guestId, request.url);
  return res;
}
