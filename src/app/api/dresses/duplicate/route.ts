import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import {
  withNormalizedDressCategory,
  withResolvedProductType,
} from "@/lib/dresses/category";
import { buildDressDuplicateInsert } from "@/lib/products/duplicate-product";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import type { Dress } from "@/types";

const bodySchema = z.object({
  id: z.string().min(1, "معرّف المنتج غير صالح"),
});

/** Columns that may be missing on older DBs — strip on PGRST204 retry. */
const OPTIONAL_COLUMNS = [
  "name_en",
  "name_he",
  "short_description",
  "slug",
  "sku",
  "sale_price",
  "cost_price",
  "status",
  "tags",
  "collection_id",
  "category_id",
  "product_type",
  "order_options_config",
  "extra_services_config",
  "experience_config",
  "features_config",
] as const;

function stripMissingColumns(
  row: Record<string, unknown>,
  errorMessage: string
): Record<string, unknown> {
  const next = { ...row };
  for (const col of OPTIONAL_COLUMNS) {
    if (new RegExp(col, "i").test(errorMessage)) {
      delete next[col];
    }
  }
  if (/PGRST204|42703/i.test(errorMessage)) {
    for (const col of OPTIONAL_COLUMNS) delete next[col];
  }
  return next;
}

/**
 * POST /api/dresses/duplicate
 * Body: { id } — clones an existing dress into a new independent row.
 */
export async function POST(request: Request) {
  const { error: authError } = await requireAdminApi("canMutateStore");
  if (authError) return authError;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase غير مُعد. تحققي من متغيرات البيئة." },
      { status: 503 }
    );
  }

  try {
    const { id } = bodySchema.parse(await request.json());
    const supabase = await createPrivilegedClient();

    const { data: source, error: loadError } = await supabase
      .from("dresses")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (loadError) {
      return NextResponse.json(
        { error: loadError.message || "فشل تحميل المنتج الأصلي" },
        { status: 400 }
      );
    }
    if (!source) {
      return NextResponse.json(
        { error: "المنتج الأصلي غير موجود" },
        { status: 404 }
      );
    }

    const row = source as Dress & { is_deleted?: boolean | null };
    if (row.is_deleted) {
      return NextResponse.json(
        { error: "لا يمكن نسخ منتج محذوف" },
        { status: 400 }
      );
    }

    const insertRow = buildDressDuplicateInsert(row);

    let { data, error } = await supabase
      .from("dresses")
      .insert(insertRow)
      .select()
      .single();

    if (
      error &&
      /name_en|name_he|short_description|slug|sku|sale_price|cost_price|status|tags|collection_id|category_id|product_type|order_options_config|extra_services_config|experience_config|features_config|PGRST204|42703/i.test(
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
      console.error("[dresses/duplicate]", error);
      return NextResponse.json(
        {
          error:
            error.message ||
            "فشل نسخ المنتج. لم يتم إنشاء منتج جزئي.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      product: withResolvedProductType(
        withNormalizedDressCategory(data as Dress)
      ),
      message:
        "Product duplicated successfully. You are now editing the new product.",
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.issues[0]?.message ?? "بيانات غير صالحة" },
        { status: 400 }
      );
    }
    console.error("[dresses/duplicate]", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "فشل نسخ المنتج",
      },
      { status: 400 }
    );
  }
}
