import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCustomerApi } from "@/lib/customer-auth/customer";
import { isMissingTableError } from "@/lib/supabase/errors";

export async function GET() {
  const auth = await requireCustomerApi();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("saved_designs")
    .select("*")
    .eq("customer_id", auth.customer.id)
    .order("updated_at", { ascending: false });

  if (error && isMissingTableError(error, "saved_designs")) {
    return NextResponse.json({
      designs: [],
      stub: true,
      note: "التصاميم المحفوظة — واجهة جاهزة؛ لا توجد بيانات بعد",
    });
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({
    designs: data ?? [],
    stub: (data?.length ?? 0) === 0,
  });
}

export async function DELETE(request: Request) {
  const auth = await requireCustomerApi();
  if (auth.error) return auth.error;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id مطلوب" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("saved_designs")
    .delete()
    .eq("id", id)
    .eq("customer_id", auth.customer.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
