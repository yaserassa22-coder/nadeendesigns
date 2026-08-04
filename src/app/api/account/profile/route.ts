import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCustomerApi } from "@/lib/customer-auth/customer";

export async function GET() {
  const auth = await requireCustomerApi();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const { data: addresses } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("customer_id", auth.customer.id)
    .order("is_default", { ascending: false });

  return NextResponse.json({
    customer: auth.customer,
    addresses: addresses ?? [],
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireCustomerApi();
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const allowed = [
    "full_name",
    "phone",
    "email",
    "photo_url",
    "birthday",
    "wedding_date",
    "preferred_language",
    "default_address_id",
  ] as const;

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("customers")
    .update(patch)
    .eq("id", auth.customer.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ customer: data });
}
