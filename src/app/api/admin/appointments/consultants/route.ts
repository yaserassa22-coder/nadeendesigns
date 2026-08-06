import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { isMissingTableError } from "@/lib/supabase/errors";

export async function GET() {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ consultants: [] });
  }

  const supabase = await createPrivilegedClient();
  const { data, error } = await supabase
    .from("consultants")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    if (isMissingTableError(error, "consultants")) {
      return NextResponse.json({
        consultants: [],
        warning:
          "جدول consultants غير موجود. نفّذي APPLY_SMART_APPOINTMENTS.sql",
      });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ consultants: data ?? [] });
}

export async function POST(request: Request) {
  const { error: authError } = await requireAdminApi("canMutateStore");
  if (authError) return authError;

  const body = (await request.json()) as {
    name_ar?: string;
    active?: boolean;
    sort_order?: number;
  };
  if (!body.name_ar?.trim()) {
    return NextResponse.json({ error: "اسم المستشارة مطلوب" }, { status: 400 });
  }

  const supabase = await createPrivilegedClient();
  const { data, error } = await supabase
    .from("consultants")
    .insert({
      name_ar: body.name_ar.trim(),
      active: body.active ?? true,
      sort_order: body.sort_order ?? 0,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ consultant: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { error: authError } = await requireAdminApi("canMutateStore");
  if (authError) return authError;

  const body = (await request.json()) as {
    id?: string;
    name_ar?: string;
    active?: boolean;
    sort_order?: number;
  };
  if (!body.id) {
    return NextResponse.json({ error: "المعرّف مطلوب" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.name_ar !== undefined) updates.name_ar = body.name_ar.trim();
  if (body.active !== undefined) updates.active = body.active;
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;

  const supabase = await createPrivilegedClient();
  const { error } = await supabase
    .from("consultants")
    .update(updates)
    .eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
