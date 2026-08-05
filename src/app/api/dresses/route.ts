import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import {
  normalizeDressList,
  withNormalizedDressCategory,
  withResolvedProductType,
} from "@/lib/dresses/category";
import { assertSameKindMove } from "@/lib/categories/kind";
import { resolveDressCategory } from "@/lib/categories/resolve-dress";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { dressPayloadSchema, dressPayloadBaseSchema } from "@/lib/validations/dress";
import {
  deriveProductStatus,
  isAvailableFromStatus,
  type ProductStatus,
} from "@/lib/products/status";
import type { Dress } from "@/types";

/** Columns introduced in migration 035 / 036 — strip on PGRST204 retry. */
const P11_COLUMNS = [
  "name_en",
  "short_description",
  "slug",
  "sku",
  "sale_price",
  "cost_price",
  "status",
  "tags",
  "collection_id",
  "product_type",
  "order_options_config",
  "extra_services_config",
  "experience_config",
] as const;

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags?.length) return [];
  return [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
}

function applyStatusDualWrite(
  row: Record<string, unknown>,
  statusInput: ProductStatus | undefined,
  isAvailableInput: boolean | undefined
) {
  const status = deriveProductStatus({
    status: statusInput,
    is_available:
      isAvailableInput !== undefined
        ? isAvailableInput
        : statusInput
          ? isAvailableFromStatus(statusInput)
          : true,
  });
  row.status = status;
  row.is_available =
    isAvailableInput !== undefined
      ? isAvailableInput
      : isAvailableFromStatus(status);
}

function stripMissingColumns(
  row: Record<string, unknown>,
  errorMessage: string
): Record<string, unknown> {
  const next = { ...row };
  delete next.category_id;
  for (const col of P11_COLUMNS) {
    if (new RegExp(col, "i").test(errorMessage)) {
      delete next[col];
    }
  }
  // If schema cache is stale for any P1.1 field, strip all additive cols once
  if (/PGRST204|42703/i.test(errorMessage)) {
    for (const col of P11_COLUMNS) delete next[col];
  }
  return next;
}

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
    const insertRow: Record<string, unknown> = {
      name_ar: body.name_ar,
      name_en: emptyToNull(body.name_en ?? null),
      description_ar: body.description_ar ?? "",
      short_description: emptyToNull(body.short_description ?? null),
      slug: emptyToNull(body.slug ?? null),
      sku: emptyToNull(body.sku ?? null),
      category: resolved.textKey,
      category_id: resolved.category.id,
      collection_id: body.collection_id ?? null,
      product_type: body.product_type ?? "ready_to_buy",
      order_options_config: body.order_options_config ?? null,
      extra_services_config: body.extra_services_config ?? null,
      experience_config: body.experience_config ?? null,
      price: body.price ?? null,
      sale_price: body.sale_price ?? null,
      cost_price: body.cost_price ?? null,
      rental_price: body.rental_price ?? null,
      size: body.size ?? null,
      color: body.color ?? null,
      style: body.style ?? null,
      tags: normalizeTags(body.tags),
      is_featured: body.is_featured ?? false,
      images: body.images ?? [],
      updated_at: new Date().toISOString(),
    };
    applyStatusDualWrite(insertRow, body.status, body.is_available);

    console.info("[dresses API] inserting", {
      category: insertRow.category,
      category_id: insertRow.category_id,
      name_ar: insertRow.name_ar,
      status: insertRow.status,
    });

    let { data, error } = await supabase
      .from("dresses")
      .insert(insertRow)
      .select()
      .single();

    // Graceful if category_id / P1.1 columns not yet migrated
    if (
      error &&
      /category_id|name_en|short_description|slug|sku|sale_price|cost_price|status|tags|collection_id|product_type|order_options_config|extra_services_config|experience_config|PGRST204|42703/i.test(
        `${error.message}${error.code}`
      )
    ) {
      const withoutNew = stripMissingColumns(
        insertRow,
        `${error.message}${error.code}`
      );
      const retry = await supabase
        .from("dresses")
        .insert(withoutNew)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      const mapped = mapDressWriteError(error);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }

    return NextResponse.json(
      withResolvedProductType(withNormalizedDressCategory(data as Dress))
    );
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

    if (parsed.data.name_en !== undefined) {
      update.name_en = emptyToNull(parsed.data.name_en);
    }
    if (parsed.data.short_description !== undefined) {
      update.short_description = emptyToNull(parsed.data.short_description);
    }
    if (parsed.data.slug !== undefined) {
      update.slug = emptyToNull(parsed.data.slug);
    }
    if (parsed.data.sku !== undefined) {
      update.sku = emptyToNull(parsed.data.sku);
    }
    if (parsed.data.tags !== undefined) {
      update.tags = normalizeTags(parsed.data.tags);
    }
    if (
      parsed.data.status !== undefined ||
      parsed.data.is_available !== undefined
    ) {
      applyStatusDualWrite(
        update,
        parsed.data.status,
        parsed.data.is_available
      );
    }

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
      /category_id|name_en|short_description|slug|sku|sale_price|cost_price|status|tags|collection_id|product_type|order_options_config|extra_services_config|experience_config|PGRST204|42703/i.test(
        `${error.message}${error.code}`
      )
    ) {
      const withoutNew = stripMissingColumns(
        update,
        `${error.message}${error.code}`
      );
      const retry = await supabase
        .from("dresses")
        .update(withoutNew)
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

    return NextResponse.json(
      withResolvedProductType(withNormalizedDressCategory(data as Dress))
    );
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
