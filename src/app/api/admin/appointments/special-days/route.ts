import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { isMissingTableError } from "@/lib/supabase/errors";

export async function GET() {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ days: [] });
  }

  const supabase = await createPrivilegedClient();
  const { data, error } = await supabase
    .from("special_days")
    .select("*")
    .order("day_date", { ascending: true });

  if (error) {
    if (isMissingTableError(error, "special_days")) {
      return NextResponse.json({
        days: [],
        warning: "جدول special_days غير موجود. نفّذي APPLY_SMART_APPOINTMENTS.sql",
      });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ days: data ?? [] });
}

export async function POST(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  const body = (await request.json()) as {
    day_date?: string;
    day_type?: string;
    note?: string;
  };
  if (!body.day_date || !body.day_type) {
    return NextResponse.json(
      { error: "التاريخ ونوع اليوم مطلوبان" },
      { status: 400 }
    );
  }

  const supabase = await createPrivilegedClient();
  const { data, error } = await supabase
    .from("special_days")
    .upsert(
      {
        day_date: body.day_date,
        day_type: body.day_type,
        note: body.note?.trim() || null,
      },
      { onConflict: "day_date" }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ day: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "المعرّف مطلوب" }, { status: 400 });
  }

  const supabase = await createPrivilegedClient();
  const { error } = await supabase.from("special_days").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
