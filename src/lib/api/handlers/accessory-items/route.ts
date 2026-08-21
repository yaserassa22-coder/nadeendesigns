import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getErrorMessage,
  isMissingTableError,
  missingShopSchemaMessage,
} from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { accessoryItemPayloadSchema } from "@/lib/validations/shop-product";

function mapAccessoryItemError(error: unknown): { message: string; status: number } {
  console.error("[accessory-items API]", error);
  if (isMissingTableError(error, "accessory_items")) {
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
    message: raw ? `فشل حفظ المنتج: ${raw}` : "فشل حفظ المنتج",
  };
}

/** GET /api/accessory-items?category_id=<uuid> — public storefront + admin list. */
export async function GET(request: Request) {
  const categoryId = new URL(request.url).searchParams.get("category_id");
  if (!isSupabaseConfigured()) {
    return NextResponse.json([]);
  }
  const supabase = createAdminClient();
  let query = supabase
    .from("accessory_items")
    .select("*")
    .order("created_at", { ascending: false });
  if (categoryId) query = query.eq("category_id", categoryId) as typeof query;
  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error, "accessory_items")) {
      console.warn("[accessory-items API] table missing — returning empty list");
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const { error: authError } = await requireAdminApi("canMutateStore");
  if (authError) return authError;

  try {
    const body = accessoryItemPayloadSchema.parse(await request.json());
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase غير مُعد. تحققي من متغيرات البيئة." },
        { status: 503 }
      );
    }
    const supabase = await createPrivilegedClient();
    const { data, error } = await supabase
      .from("accessory_items")
      .insert({
        ...body,
        product_type: "bridal_accessory",
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) {
      const mapped = mapAccessoryItemError(error);
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
    const mapped = mapAccessoryItemError(e);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}

export async function PUT(request: Request) {
  const { error: authError } = await requireAdminApi("canMutateStore");
  if (authError) return authError;

  try {
    const raw = await request.json();
    const { id, ...rest } = raw;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "معرّف المنتج مطلوب" }, { status: 400 });
    }
    const body = accessoryItemPayloadSchema.partial().parse(rest);
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase غير مُعد. تحققي من متغيرات البيئة." },
        { status: 503 }
      );
    }
    const supabase = await createPrivilegedClient();
    const { data, error } = await supabase
      .from("accessory_items")
      .update({
        ...body,
        product_type: "bridal_accessory",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      const mapped = mapAccessoryItemError(error);
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
    const mapped = mapAccessoryItemError(e);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}

export async function DELETE(request: Request) {
  const { user, error: authError } = await requireAdminApi("canMutateStore");
  if (authError) return authError;

  const { handleModuleDelete } = await import("@/lib/admin/soft-delete-api");
  return handleModuleDelete({
    request,
    module: "accessory_items",
    actor: { id: user!.id, email: user!.email },
    missingIdMessage: "معرّف المنتج مطلوب",
  });
}
