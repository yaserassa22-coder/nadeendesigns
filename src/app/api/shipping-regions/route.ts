import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getErrorMessage,
  isMissingTableError,
} from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import {
  shippingRegionCreateSchema,
  shippingRegionUpdateSchema,
} from "@/lib/validations/shipping-region";
import type { ShippingRegion } from "@/types/shop";

const SEED_REGIONS: ShippingRegion[] = [
  { id: "b1000000-0000-4000-8000-000000000001", name_ar: "الرياض", name_en: "Riyadh", shipping_fee: 35, is_active: true, sort_order: 10 },
  { id: "b1000000-0000-4000-8000-000000000002", name_ar: "جدة", name_en: "Jeddah", shipping_fee: 40, is_active: true, sort_order: 20 },
  { id: "b1000000-0000-4000-8000-000000000003", name_ar: "الدمام", name_en: "Dammam", shipping_fee: 45, is_active: true, sort_order: 30 },
  { id: "b1000000-0000-4000-8000-000000000004", name_ar: "مكة", name_en: "Makkah", shipping_fee: 40, is_active: true, sort_order: 40 },
  { id: "b1000000-0000-4000-8000-000000000005", name_ar: "المدينة", name_en: "Madinah", shipping_fee: 45, is_active: true, sort_order: 50 },
  { id: "b1000000-0000-4000-8000-000000000006", name_ar: "القصيم", name_en: "Qassim", shipping_fee: 50, is_active: true, sort_order: 60 },
  { id: "b1000000-0000-4000-8000-000000000007", name_ar: "تبوك", name_en: "Tabuk", shipping_fee: 55, is_active: true, sort_order: 70 },
  { id: "b1000000-0000-4000-8000-000000000008", name_ar: "أبها", name_en: "Abha", shipping_fee: 55, is_active: true, sort_order: 80 },
  { id: "b1000000-0000-4000-8000-000000000009", name_ar: "حائل", name_en: "Hail", shipping_fee: 55, is_active: true, sort_order: 90 },
  { id: "b1000000-0000-4000-8000-000000000010", name_ar: "الطائف", name_en: "Taif", shipping_fee: 45, is_active: true, sort_order: 100 },
  { id: "b1000000-0000-4000-8000-000000000011", name_ar: "أخرى", name_en: "Other", shipping_fee: 60, is_active: true, sort_order: 110 },
];

function missingRegionsMessage() {
  return "جدول مناطق الشحن غير موجود. نفّذي supabase/APPLY_SHIPPING_REGIONS.sql في SQL Editor ثم أعيدي المحاولة.";
}

function mapRegionError(error: unknown): { message: string; status: number } {
  console.error("[shipping-regions API]", error);
  if (isMissingTableError(error, "shipping_regions")) {
    return { status: 503, message: missingRegionsMessage() };
  }
  const raw = getErrorMessage(error);
  if (/row-level security/i.test(raw)) {
    return {
      status: 403,
      message:
        "تم رفض العملية بسبب صلاحيات RLS. سجّلي الدخول كمسؤولة أو أضيفي SUPABASE_SERVICE_ROLE_KEY.",
    };
  }
  return {
    status: 400,
    message: raw ? `فشل حفظ المنطقة: ${raw}` : "فشل حفظ المنطقة",
  };
}

/** Public: active regions only. Admin (?all=1): all regions. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wantAll = searchParams.get("all") === "1";

  if (wantAll) {
    const { error: authError } = await requireAdminApi();
    if (authError) return authError;
  }

  if (!isSupabaseConfigured()) {
    const list = wantAll
      ? SEED_REGIONS
      : SEED_REGIONS.filter((r) => r.is_active);
    return NextResponse.json(list);
  }

  try {
    const supabase = wantAll
      ? await createPrivilegedClient()
      : createAdminClient();
    let query = supabase
      .from("shipping_regions")
      .select("*")
      .order("sort_order", { ascending: true });
    if (!wantAll) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error) {
      if (isMissingTableError(error, "shipping_regions")) {
        console.warn("[shipping-regions] table missing — seed fallback");
        const list = wantAll
          ? SEED_REGIONS
          : SEED_REGIONS.filter((r) => r.is_active);
        return NextResponse.json(list);
      }
      const mapped = mapRegionError(error);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
    return NextResponse.json(data ?? []);
  } catch (e) {
    const mapped = mapRegionError(e);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}

export async function POST(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  try {
    const parsed = shippingRegionCreateSchema.parse(await request.json());
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase غير مُعد. تحققي من متغيرات البيئة." },
        { status: 503 }
      );
    }
    const body = {
      name_ar: parsed.name_ar.trim(),
      name_en: (parsed.name_en ?? "").trim(),
      shipping_fee: Number(parsed.shipping_fee) || 0,
      is_active: parsed.is_active ?? true,
      sort_order: parsed.sort_order ?? 0,
      estimated_days: parsed.estimated_days ?? null,
      carrier_code: parsed.carrier_code ?? null,
      free_shipping_override: parsed.free_shipping_override ?? null,
      discount: parsed.discount ?? null,
      meta: parsed.meta ?? {},
      updated_at: new Date().toISOString(),
    };
    const supabase = await createPrivilegedClient();
    const { data, error } = await supabase
      .from("shipping_regions")
      .insert(body)
      .select()
      .single();
    if (error) {
      const mapped = mapRegionError(error);
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
    const mapped = mapRegionError(e);
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
      return NextResponse.json({ error: "معرّف المنطقة مطلوب" }, { status: 400 });
    }
    const parsed = shippingRegionUpdateSchema.parse(rest);
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase غير مُعد. تحققي من متغيرات البيئة." },
        { status: 503 }
      );
    }
    const body = Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => v !== undefined)
    );
    const supabase = await createPrivilegedClient();
    const { data, error } = await supabase
      .from("shipping_regions")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      const mapped = mapRegionError(error);
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
    const mapped = mapRegionError(e);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}

export async function DELETE(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "معرّف المنطقة مطلوب" }, { status: 400 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase غير مُعد. تحققي من متغيرات البيئة." },
      { status: 503 }
    );
  }

  const supabase = await createPrivilegedClient();
  const { error } = await supabase.from("shipping_regions").delete().eq("id", id);
  if (error) {
    const mapped = mapRegionError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
  return NextResponse.json({ success: true });
}
