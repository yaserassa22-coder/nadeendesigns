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
import { SEED_SHIPPING_REGIONS } from "@/lib/shop/shipping-region-seeds";

const SEED_REGIONS = SEED_SHIPPING_REGIONS;

function missingRegionsMessage() {
  return "جدول مناطق الشحن غير موجود. نفّذي supabase/APPLY_MISSING_MIGRATIONS.sql في SQL Editor ثم أعيدي المحاولة.";
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

/** Public: active regions only. Admin (?all=1): all regions.
 * Optional `q` — ILIKE search on name_ar / name_en (indexed) for large catalogs.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wantAll = searchParams.get("all") === "1";
  const q = (searchParams.get("q") ?? "").trim();

  if (wantAll) {
    const { error: authError } = await requireAdminApi();
    if (authError) return authError;
  }

  if (!isSupabaseConfigured()) {
    let list = wantAll
      ? SEED_REGIONS
      : SEED_REGIONS.filter((r) => r.is_active);
    if (q) {
      const lower = q.toLowerCase();
      list = list.filter(
        (r) =>
          r.name_ar.toLowerCase().includes(lower) ||
          r.name_en.toLowerCase().includes(lower)
      );
    }
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
    // Public checkout must never see soft-deleted / archived regions.
    if (!wantAll) {
      query = query
        .eq("is_active", true)
        .eq("is_deleted", false)
        .is("archived_at", null);
    }
    if (q) {
      // Indexed name_ar / name_en — prefer this when catalogs grow beyond in-memory filter
      const safe = q.replace(/[%_,.()]/g, " ").trim();
      if (safe) {
        const pattern = `%${safe}%`;
        query = query.or(`name_ar.ilike.${pattern},name_en.ilike.${pattern}`);
      }
    }
    const { data, error } = await query;
    if (error) {
      // Pre-migration: retry without lifecycle filters for public storefront.
      if (
        !wantAll &&
        /is_deleted|archived_at|PGRST204|42703/i.test(error.message ?? "")
      ) {
        let legacy = supabase
          .from("shipping_regions")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        if (q) {
          const safe = q.replace(/[%_,.()]/g, " ").trim();
          if (safe) {
            const pattern = `%${safe}%`;
            legacy = legacy.or(
              `name_ar.ilike.${pattern},name_en.ilike.${pattern}`
            );
          }
        }
        const retry = await legacy;
        if (!retry.error) return NextResponse.json(retry.data ?? []);
      }
      if (isMissingTableError(error, "shipping_regions")) {
        console.warn("[shipping-regions] table missing — seed fallback");
        let list = wantAll
          ? SEED_REGIONS
          : SEED_REGIONS.filter((r) => r.is_active);
        if (q) {
          const lower = q.toLowerCase();
          list = list.filter(
            (r) =>
              r.name_ar.toLowerCase().includes(lower) ||
              r.name_en.toLowerCase().includes(lower)
          );
        }
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
  const { error: authError } = await requireAdminApi("canMutateStore");
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
      name_he: (parsed.name_he ?? "").trim() || null,
      shipping_fee: Number(parsed.shipping_fee) || 0,
      is_active: parsed.is_active ?? true,
      sort_order: parsed.sort_order ?? 0,
      estimated_days: parsed.estimated_days ?? null,
      estimated_days_min: parsed.estimated_days_min ?? parsed.estimated_days ?? null,
      estimated_days_max: parsed.estimated_days_max ?? parsed.estimated_days ?? null,
      estimated_delivery_ar: parsed.estimated_delivery_ar?.trim()
        ? parsed.estimated_delivery_ar.trim()
        : null,
      estimated_delivery_he: parsed.estimated_delivery_he?.trim()
        ? parsed.estimated_delivery_he.trim()
        : null,
      estimated_delivery_en: parsed.estimated_delivery_en?.trim()
        ? parsed.estimated_delivery_en.trim()
        : null,
      carrier_code: parsed.carrier_code?.trim()
        ? parsed.carrier_code.trim()
        : null,
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
  const { error: authError } = await requireAdminApi("canMutateStore");
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
  const { user, error: authError } = await requireAdminApi("canMutateStore");
  if (authError) return authError;

  const { handleModuleDelete } = await import("@/lib/admin/soft-delete-api");
  return handleModuleDelete({
    request,
    module: "shipping_regions",
    actor: { id: user!.id, email: user!.email },
    missingIdMessage: "معرّف المنطقة مطلوب",
  });
}
