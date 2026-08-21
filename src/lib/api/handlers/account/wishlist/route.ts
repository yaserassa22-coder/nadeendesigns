import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCustomerApi } from "@/lib/customer-auth/customer";
import { isMissingTableError } from "@/lib/supabase/errors";

export async function GET() {
  const auth = await requireCustomerApi();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("wishlist_items")
    .select("*")
    .eq("customer_id", auth.customer.id)
    .order("created_at", { ascending: false });

  if (error && isMissingTableError(error, "wishlist_items")) {
    return NextResponse.json({ items: [], stub: true });
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireCustomerApi();
  if (auth.error) return auth.error;

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

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("wishlist_items")
    .upsert(
      {
        customer_id: auth.customer.id,
        product_kind: body.product_kind || "dress",
        product_id: body.product_id,
        product_slug: body.product_slug ?? null,
        product_title: body.product_title ?? null,
        product_image_url: body.product_image_url ?? null,
      },
      { onConflict: "customer_id,product_kind,product_id" }
    )
    .select("*")
    .single();

  if (error) {
    if (isMissingTableError(error, "wishlist_items")) {
      return NextResponse.json(
        { error: "قائمة الأمنيات غير جاهزة — طبّقي ترحيل 028" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ item: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireCustomerApi();
  if (auth.error) return auth.error;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id مطلوب" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("wishlist_items")
    .delete()
    .eq("id", id)
    .eq("customer_id", auth.customer.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
