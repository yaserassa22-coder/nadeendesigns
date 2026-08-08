import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { isMissingTableError } from "@/lib/supabase/errors";

export async function GET() {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ entries: [] });
  }

  const supabase = await createPrivilegedClient();
  const { data, error } = await supabase
    .from("waiting_list")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingTableError(error, "waiting_list")) {
      return NextResponse.json({
        entries: [],
        warning: "جدول waiting_list غير موجود. نفّذي APPLY_SMART_APPOINTMENTS.sql",
      });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ entries: data ?? [] });
}

export async function POST(request: Request) {
  const { error: authError } = await requireAdminApi("canMutateStore");
  if (authError) return authError;

  const body = (await request.json()) as Record<string, unknown>;
  if (!body.name || !body.phone) {
    return NextResponse.json(
      { error: "الاسم ورقم الهاتف مطلوبان" },
      { status: 400 }
    );
  }

  const supabase = await createPrivilegedClient();
  const { data, error } = await supabase
    .from("waiting_list")
    .insert({
      name: String(body.name).trim(),
      phone: String(body.phone).trim(),
      email: body.email ? String(body.email).trim() : null,
      preferred_date: body.preferred_date || null,
      preferred_time: body.preferred_time || null,
      consultant_id: body.consultant_id || null,
      notes: body.notes ? String(body.notes).trim() : null,
      status: "waiting",
      notify_whatsapp: body.notify_whatsapp !== false,
      notify_email: body.notify_email !== false,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ entry: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { error: authError } = await requireAdminApi("canMutateStore");
  if (authError) return authError;

  const body = (await request.json()) as { id?: string; status?: string };
  if (!body.id || !body.status) {
    return NextResponse.json(
      { error: "المعرّف والحالة مطلوبان" },
      { status: 400 }
    );
  }

  const allowed = ["waiting", "notified", "booked", "cancelled"];
  if (!allowed.includes(body.status)) {
    return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
  }

  const supabase = await createPrivilegedClient();
  const { error } = await supabase
    .from("waiting_list")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { error: authError } = await requireAdminApi("canMutateStore");
  if (authError) return authError;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "المعرّف مطلوب" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "قاعدة البيانات غير مُعدّة" },
      { status: 503 }
    );
  }

  const supabase = await createPrivilegedClient();
  const { error } = await supabase.from("waiting_list").delete().eq("id", id);

  if (error) {
    if (isMissingTableError(error, "waiting_list")) {
      return NextResponse.json(
        { error: "جدول waiting_list غير موجود" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
