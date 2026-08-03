import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { SEED_BRIDAL_ROBES } from "@/lib/data/shop-seed";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getErrorMessage,
  isMissingTableError,
  missingShopSchemaMessage,
} from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { bridalRobePayloadSchema } from "@/lib/validations/shop-product";

function mapRobeError(error: unknown): { message: string; status: number } {
  console.error("[bridal-robes API]", error);
  if (isMissingTableError(error, "bridal_robes")) {
    return { status: 503, message: missingShopSchemaMessage() };
  }
  if (/row-level security/i.test(getErrorMessage(error))) {
    return {
      status: 403,
      message:
        "تم رفض العملية بسبب صلاحيات RLS. سجّلي الدخول كمسؤولة أو أضيفي SUPABASE_SERVICE_ROLE_KEY.",
    };
  }
  const raw = getErrorMessage(error);
  return {
    status: 400,
    message: raw ? `فشل حفظ البرنص: ${raw}` : "فشل حفظ البرنص",
  };
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(SEED_BRIDAL_ROBES);
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bridal_robes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    if (isMissingTableError(error, "bridal_robes")) {
      console.warn("[bridal-robes API] table missing — returning seed data");
      return NextResponse.json(SEED_BRIDAL_ROBES);
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  try {
    const body = bridalRobePayloadSchema.parse(await request.json());
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase غير مُعد. تحققي من متغيرات البيئة." },
        { status: 503 }
      );
    }
    const supabase = await createPrivilegedClient();
    const { data, error } = await supabase
      .from("bridal_robes")
      .insert({ ...body, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) {
      const mapped = mapRobeError(error);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.issues[0]?.message ?? "بيانات غير صالحة" },
        { status: 400 }
      );
    }
    const mapped = mapRobeError(e);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}

export async function PUT(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  try {
    const rawBody = await request.json();
    const { id, ...rest } = rawBody;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "معرّف المنتج مطلوب" }, { status: 400 });
    }
    const body = bridalRobePayloadSchema.partial().parse(rest);
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase غير مُعد. تحققي من متغيرات البيئة." },
        { status: 503 }
      );
    }
    const supabase = await createPrivilegedClient();
    const { data, error } = await supabase
      .from("bridal_robes")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      const mapped = mapRobeError(error);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.issues[0]?.message ?? "بيانات غير صالحة" },
        { status: 400 }
      );
    }
    const mapped = mapRobeError(e);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}

export async function DELETE(request: Request) {
  const { user, error: authError } = await requireAdminApi();
  if (authError) return authError;

  const { handleModuleDelete } = await import("@/lib/admin/soft-delete-api");
  return handleModuleDelete({
    request,
    module: "bridal_robes",
    actor: { id: user!.id, email: user!.email },
    missingIdMessage: "معرّف المنتج مطلوب",
  });
}
