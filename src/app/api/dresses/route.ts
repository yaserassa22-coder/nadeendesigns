import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import {
  normalizeDressList,
  withNormalizedDressCategory,
} from "@/lib/dresses/category";
import { assertSameKindMove } from "@/lib/categories/kind";
import { resolveDressCategory } from "@/lib/categories/resolve-dress";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { dressPayloadSchema, dressPayloadBaseSchema } from "@/lib/validations/dress";
import type { Dress } from "@/types";

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
      message: `قيمة التصنيف مرفوضة من قاعدة البيانات. نفّذي supabase/APPLY_DROP_CATEGORY_CHECK.sql ثم APPLY_PRODUCT_CATEGORY_ID.sql. التفاصيل: ${raw}`,
    };
  }

  if (code === "23503" || /foreign key|category_id/i.test(raw)) {
    return {
      status: 400,
      message: `التصنيف غير موجود أو غير صالح. التفاصيل: ${raw}`,
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
      category_id: json?.category_id,
      price: json?.price,
      imagesCount: Array.isArray(json?.images) ? json.images.length : 0,
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
    const resolved = await resolveDressCategory({
      category_id: body.category_id,
      category: body.category,
    });
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.message }, { status: 400 });
    }

    const kindCheck = assertSameKindMove("dress", resolved.category);
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
      category: resolved.textKey,
      category_id: resolved.category.id,
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
      category_id: insertRow.category_id,
      name_ar: insertRow.name_ar,
    });

    let { data, error } = await supabase
      .from("dresses")
      .insert(insertRow)
      .select()
      .single();

    // Graceful if category_id column not yet migrated
    if (
      error &&
      /category_id|PGRST204|42703/i.test(`${error.message}${error.code}`)
    ) {
      const withoutFk = {
        name_ar: insertRow.name_ar,
        description_ar: insertRow.description_ar,
        category: insertRow.category,
        price: insertRow.price,
        rental_price: insertRow.rental_price,
        size: insertRow.size,
        color: insertRow.color,
        style: insertRow.style,
        is_featured: insertRow.is_featured,
        is_available: insertRow.is_available,
        images: insertRow.images,
        updated_at: insertRow.updated_at,
      };
      const retry = await supabase
        .from("dresses")
        .insert(withoutFk)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

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
      category_id: rest?.category_id,
      name_ar: rest?.name_ar,
    });

    const parsed = dressPayloadBaseSchema.partial().safeParse(rest);
    if (!parsed.success) {
      const mapped = mapDressWriteError(parsed.error);
      console.error("[dresses API] Zod validation failed", parsed.error.issues);
      return NextResponse.json(
        { error: mapped.message, issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    };

    const touchingCategory =
      parsed.data.category_id !== undefined ||
      parsed.data.category !== undefined;
    if (touchingCategory) {
      if (!parsed.data.category_id && !parsed.data.category) {
        return NextResponse.json(
          { error: "التصنيف مطلوب" },
          { status: 400 }
        );
      }
      const resolved = await resolveDressCategory({
        category_id: parsed.data.category_id,
        category: parsed.data.category,
      });
      if (!resolved.ok) {
        return NextResponse.json({ error: resolved.message }, { status: 400 });
      }
      const kindCheck = assertSameKindMove("dress", resolved.category);
      if (!kindCheck.ok) {
        return NextResponse.json({ error: kindCheck.message }, { status: 400 });
      }
      update.category = resolved.textKey;
      update.category_id = resolved.category.id;
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase غير مُعد. تحققي من متغيرات البيئة." },
        { status: 503 }
      );
    }

    const supabase = await createPrivilegedClient();
    let { data, error } = await supabase
      .from("dresses")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (
      error &&
      /category_id|PGRST204|42703/i.test(`${error.message}${error.code}`)
    ) {
      const withoutFk = { ...update };
      delete withoutFk.category_id;
      const retry = await supabase
        .from("dresses")
        .update(withoutFk)
        .eq("id", id)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

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
