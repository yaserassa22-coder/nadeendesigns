import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCustomerApi } from "@/lib/customer-auth/customer";
import { isMissingTableError } from "@/lib/supabase/errors";

export async function GET() {
  const auth = await requireCustomerApi();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("customer_reviews")
    .select("*")
    .eq("customer_id", auth.customer.id)
    .order("created_at", { ascending: false });

  if (error && isMissingTableError(error, "customer_reviews")) {
    return NextResponse.json({ reviews: [], stub: true });
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ reviews: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireCustomerApi();
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => ({}))) as {
    rating?: number;
    title?: string;
    body?: string;
    photo_urls?: string[];
    product_kind?: string;
    product_id?: string;
    order_id?: string;
  };

  const rating = Number(body.rating);
  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "التقييم من 1 إلى 5" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("customer_reviews")
    .insert({
      customer_id: auth.customer.id,
      rating,
      title: body.title ?? null,
      body: body.body ?? null,
      photo_urls: body.photo_urls ?? [],
      product_kind: body.product_kind ?? null,
      product_id: body.product_id ?? null,
      order_id: body.order_id ?? null,
      is_published: false,
    })
    .select("*")
    .single();

  if (error) {
    if (isMissingTableError(error, "customer_reviews")) {
      return NextResponse.json(
        { error: "المراجعات غير جاهزة بعد" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ review: data });
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
    .from("customer_reviews")
    .delete()
    .eq("id", id)
    .eq("customer_id", auth.customer.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
