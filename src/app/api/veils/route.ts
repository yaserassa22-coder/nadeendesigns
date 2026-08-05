import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { SEED_VEILS } from "@/lib/data/shop-seed";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getErrorMessage,
  isMissingTableError,
  missingShopSchemaMessage,
} from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { veilPayloadSchema } from "@/lib/validations/shop-product";

function mapVeilError(error: unknown): { message: string; status: number } {
  console.error("[veils API]", error);
  if (isMissingTableError(error, "veils")) {
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
    message: raw ? `فشل حفظ الطرحة: ${raw}` : "فشل حفظ الطرحة",
  };
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(SEED_VEILS);
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("veils")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    if (isMissingTableError(error, "veils")) {
      console.warn("[veils API] table missing — returning seed data");
      return NextResponse.json(SEED_VEILS);
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  try {
    const body = veilPayloadSchema.parse(await request.json());
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase غير مُعد. تحققي من متغيرات البيئة." },
        { status: 503 }
      );
    }
    const supabase = await createPrivilegedClient();
    const { data, error } = await supabase
      .from("veils")
      .insert({
        ...body,
        product_type: "bridal_accessory",
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) {
      const mapped = mapVeilError(error);
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
    const mapped = mapVeilError(e);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}

export async function PUT(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  try {
    const raw = await request.json();
    const { id, ...rest } = raw;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "معرّف المنتج مطلوب" }, { status: 400 });
    }
    const body = veilPayloadSchema.partial().parse(rest);
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase غير مُعد. تحققي من متغيرات البيئة." },
        { status: 503 }
      );
    }
    const supabase = await createPrivilegedClient();
    const { data, error } = await supabase
      .from("veils")
      .update({
        ...body,
        product_type: "bridal_accessory",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      const mapped = mapVeilError(error);
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
    const mapped = mapVeilError(e);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}

export async function DELETE(request: Request) {
  const { user, error: authError } = await requireAdminApi();
  if (authError) return authError;

  const { handleModuleDelete } = await import("@/lib/admin/soft-delete-api");
  return handleModuleDelete({
    request,
    module: "veils",
    actor: { id: user!.id, email: user!.email },
    missingIdMessage: "معرّف المنتج مطلوب",
  });
}
