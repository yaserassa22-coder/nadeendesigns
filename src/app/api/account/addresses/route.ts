import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCustomerApi } from "@/lib/customer-auth/customer";
import { isMissingTableError } from "@/lib/supabase/errors";

export async function GET() {
  const auth = await requireCustomerApi();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("customer_id", auth.customer.id)
    .order("is_default", { ascending: false });

  if (error && isMissingTableError(error, "customer_addresses")) {
    return NextResponse.json({ addresses: [], stub: true });
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ addresses: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireCustomerApi();
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const supabase = createAdminClient();

  if (body.is_default) {
    await supabase
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("customer_id", auth.customer.id);
  }

  const { data, error } = await supabase
    .from("customer_addresses")
    .insert({
      customer_id: auth.customer.id,
      label: body.label || "المنزل",
      full_name: body.full_name || auth.customer.full_name,
      phone: body.phone ?? auth.customer.phone,
      city: body.city ?? null,
      region: body.region ?? null,
      street: body.street ?? null,
      building: body.building ?? null,
      apartment: body.apartment ?? null,
      postal_code: body.postal_code ?? null,
      notes: body.notes ?? null,
      is_default: Boolean(body.is_default),
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ address: data });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireCustomerApi();
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  > & { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "id مطلوب" }, { status: 400 });
  }

  const supabase = createAdminClient();
  if (body.is_default) {
    await supabase
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("customer_id", auth.customer.id);
  }

  const { id, ...rest } = body;
  const { data, error } = await supabase
    .from("customer_addresses")
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("customer_id", auth.customer.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ address: data });
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
    .from("customer_addresses")
    .delete()
    .eq("id", id)
    .eq("customer_id", auth.customer.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
