import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import {
  normalizeDressList,
  withNormalizedDressCategory,
} from "@/lib/dresses/category";
import { assertSameKindMove } from "@/lib/categories/kind";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { dressPayloadSchema } from "@/lib/validations/dress";
import { DRESS_CATEGORIES, type Dress } from "@/types";

function extractErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues
      .map((issue) => {
        const path = issue.path.length ? issue.path.join(".") : "البيانات";
        return `${path}: ${issue.message}`;
      })
      .join(" | ");
  }

  if (error && typeof error === "object") {
    const obj = error as {
      message?: string;
      code?: string;
      details?: string;
      hint?: string;
    };
    const parts = [
      obj.message,
      obj.details,
      obj.hint,
      obj.code ? `(code: ${obj.code})` : null,
    ].filter(Boolean);
    if (parts.length) return parts.join(" — ");
  }

  if (error instanceof Error) return error.message;
  return String(error ?? "خطأ غير معروف");
}

function mapDressWriteError(error: unknown): { status: number; message: string } {
  const raw = extractErrorMessage(error);
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code ?? "")
      : "";

  console.error("[dresses API]", { code, raw, error });

  if (
    code === "23514" ||
    /dresses_category_check|check constraint/i.test(raw)
  ) {
    return {
      status: 400,
      message: `قيمة التصنيف مرفوضة من قاعدة البيانات. تأكدي أن constraint يقبل: ${DRESS_CATEGORIES.join(", ")}. نفّذي supabase/APPLY_NOUF_DRESSES_CATEGORY.sql ثم أعيدي المحاولة. التفاصيل: ${raw}`,
    };
  }

  if (code === "42501" || /row-level security/i.test(raw)) {
    return {
      status: 403,
      message: `تم رفض الحفظ بسبب صلاحيات RLS. سجّلي الدخول كمسؤولة أو أضيفي SUPABASE_SERVICE_ROLE_KEY. التفاصيل: ${raw}`,
    };
  }

  if (error instanceof z.ZodError) {
    return { status: 400, message: raw };
  }

  return { status: 400, message: raw || "فشل حفظ المنتج" };
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json([]);
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("dresses")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    const mapped = mapDressWriteError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
  return NextResponse.json(normalizeDressList((data ?? []) as Dress[]));
}

export async function POST(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  try {
    const json = await request.json();
    console.info("[dresses API] POST payload", {
      name_ar: json?.name_ar,
      category: json?.category,
      price: json?.price,
      imagesCount: Array.isArray(json?.images) ? json.images.length : 0,
      allowedCategories: DRESS_CATEGORIES,
    });

    const parsed = dressPayloadSchema.safeParse(json);
    if (!parsed.success) {
      const mapped = mapDressWriteError(parsed.error);
      console.error("[dresses API] Zod validation failed", parsed.error.issues);
      return NextResponse.json(
        {
          error: mapped.message,
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const body = parsed.data;

    const kindCheck = assertSameKindMove("dress", body.category);
    if (!kindCheck.ok) {
      return NextResponse.json({ error: kindCheck.message }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase غير مُعد. تحققي من متغيرات البيئة." },
        { status: 503 }
      );
    }

    const supabase = await createPrivilegedClient();
    const insertRow = {
      name_ar: body.name_ar,
      description_ar: body.description_ar ?? "",
      category: body.category, // canonical: wedding | rental | custom_design | nouf_dresses
      price: body.price ?? null,
      rental_price: body.rental_price ?? null,
      size: body.size ?? null,
      color: body.color ?? null,
      style: body.style ?? null,
      is_featured: body.is_featured ?? false,
      is_available: body.is_available ?? true,
      images: body.images ?? [],
      updated_at: new Date().toISOString(),
    };

    console.info("[dresses API] inserting", {
      category: insertRow.category,
      name_ar: insertRow.name_ar,
    });

    const { data, error } = await supabase
      .from("dresses")
      .insert(insertRow)
      .select()
      .single();

    if (error) {
      const mapped = mapDressWriteError(error);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }

    return NextResponse.json(withNormalizedDressCategory(data as Dress));
  } catch (e) {
    const mapped = mapDressWriteError(e);
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

    console.info("[dresses API] PUT payload", {
      id,
      category: rest?.category,
      name_ar: rest?.name_ar,
    });

    const parsed = dressPayloadSchema.partial().safeParse(rest);
    if (!parsed.success) {
      const mapped = mapDressWriteError(parsed.error);
      console.error("[dresses API] Zod validation failed", parsed.error.issues);
      return NextResponse.json(
        { error: mapped.message, issues: parsed.error.issues },
        { status: 400 }
      );
    }

    if (parsed.data.category) {
      const kindCheck = assertSameKindMove("dress", parsed.data.category);
      if (!kindCheck.ok) {
        return NextResponse.json({ error: kindCheck.message }, { status: 400 });
      }
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase غير مُعد. تحققي من متغيرات البيئة." },
        { status: 503 }
      );
    }

    const supabase = await createPrivilegedClient();
    const { data, error } = await supabase
      .from("dresses")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      const mapped = mapDressWriteError(error);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }

    return NextResponse.json(withNormalizedDressCategory(data as Dress));
  } catch (e) {
    const mapped = mapDressWriteError(e);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}

export async function DELETE(request: Request) {
  const { user, error: authError } = await requireAdminApi();
  if (authError) return authError;

  const { handleModuleDelete } = await import("@/lib/admin/soft-delete-api");
  return handleModuleDelete({
    request,
    module: "dresses",
    actor: { id: user!.id, email: user!.email },
    missingIdMessage: "معرّف المنتج مطلوب",
  });
}
