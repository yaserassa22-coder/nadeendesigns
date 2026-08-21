import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import type { AccessoryItem } from "@/types/shop";

const bodySchema = z.object({
  id: z.string().min(1, "معرّف المنتج غير صالح"),
});

/**
 * POST /api/accessory-items/duplicate
 * Body: { id } — clones an existing generic accessory item into a new draft row.
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
      .from("accessory_items")
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
      return NextResponse.json({ error: "المنتج الأصلي غير موجود" }, { status: 404 });
    }

    const row = source as AccessoryItem & { is_deleted?: boolean | null };
    if (row.is_deleted) {
      return NextResponse.json({ error: "لا يمكن نسخ منتج محذوف" }, { status: 400 });
    }

    const insertRow = {
      category_id: row.category_id,
      name_ar: `${row.name_ar} (نسخة)`,
      name_en: row.name_en ?? null,
      name_he: row.name_he ?? null,
      description_ar: row.description_ar ?? "",
      price: row.price ?? 0,
      sale_price: row.sale_price ?? null,
      images: [...(row.images ?? [])],
      color: row.color ?? null,
      material: row.material ?? null,
      size: row.size ?? null,
      stock_quantity: row.stock_quantity ?? 0,
      is_available: false,
      is_featured: false,
      product_type: "bridal_accessory",
      order_options_config: row.order_options_config ?? null,
      extra_services_config: row.extra_services_config ?? null,
      experience_config: row.experience_config ?? null,
      features_config: row.features_config ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("accessory_items")
      .insert(insertRow)
      .select()
      .single();

    if (error) {
      console.error("[accessory-items/duplicate]", error);
      return NextResponse.json(
        { error: error.message || "فشل نسخ المنتج" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      product: data,
      message: "تم نسخ المنتج بنجاح. يمكنك تعديله الآن.",
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.issues[0]?.message ?? "بيانات غير صالحة" },
        { status: 400 }
      );
    }
    console.error("[accessory-items/duplicate]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل نسخ المنتج" },
      { status: 400 }
    );
  }
}
