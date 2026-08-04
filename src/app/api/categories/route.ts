import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { resolveCategoryHref } from "@/lib/categories/href";
import { getCategoryProductCounts } from "@/lib/categories/product-counts";
import { countDressesForCategory } from "@/lib/categories/product-refs";
import { revalidateCategoryPaths } from "@/lib/categories/revalidate";
import { SEED_CATEGORIES } from "@/types/category";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getErrorMessage,
  isMissingTableError,
} from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { normalizeCategoryRow } from "@/lib/data/categories";
import { categoryCreateSchema, categoryUpdateSchema } from "@/lib/validations/category";
import type { Category } from "@/types/category";

export type CategoryWithCount = Category & { product_count?: number };

/** Never serve a cached category list to admin product selectors. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson(data: unknown, init?: { status?: number }) {
  return NextResponse.json(data, {
    status: init?.status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

function missingCategoriesMessage() {
  return "جدول التصنيفات غير موجود. نفّذي supabase/APPLY_CATEGORIES.sql في SQL Editor ثم أعيدي المحاولة.";
}

function mapCategoryError(error: unknown): { message: string; status: number } {
  console.error("[categories API]", error);
  if (isMissingTableError(error, "categories")) {
    return { status: 503, message: missingCategoriesMessage() };
  }
  const raw = getErrorMessage(error);
  if (/duplicate key|unique/i.test(raw)) {
    return { status: 400, message: "المعرّف (slug) مستخدم مسبقاً" };
  }
  if (/row-level security/i.test(raw)) {
    return {
      status: 403,
      message:
        "تم رفض العملية بسبب صلاحيات RLS. سجّلي الدخول كمسؤولة أو أضيفي SUPABASE_SERVICE_ROLE_KEY.",
    };
  }
  return {
    status: 400,
    message: raw ? `فشل حفظ التصنيف: ${raw}` : "فشل حفظ التصنيف",
  };
}

function inferProductKind(): string {
  // New Admin categories are dress sections by default (same as seeded dress roots).
  return "dress";
}

export async function GET(request: Request) {
  const countsParam = new URL(request.url).searchParams.get("counts");
  const includeCounts = countsParam === "1" || countsParam === "true";

  const withOptionalCounts = async (rows: Category[]) => {
    if (!includeCounts) return rows;
    const counts = await getCategoryProductCounts(rows);
    return rows.map((c) => ({
      ...c,
      product_count: counts[c.id] ?? 0,
    })) satisfies CategoryWithCount[];
  };

  if (!isSupabaseConfigured()) {
    return noStoreJson(await withOptionalCounts(SEED_CATEGORIES));
  }
  const supabase = createAdminClient();
  let query = supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  query = query.eq("is_deleted", false) as typeof query;
  let { data, error } = await query;
  if (error && /is_deleted|PGRST204|42703/i.test(`${error.message}${error.code}`)) {
    const retry = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });
    data = retry.data;
    error = retry.error;
  }
  if (error) {
    if (isMissingTableError(error, "categories")) {
      console.warn("[categories API] table missing — returning seed data");
      return noStoreJson(await withOptionalCounts(SEED_CATEGORIES));
    }
    return noStoreJson(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
  const normalized = ((data as Category[]) ?? []).map(normalizeCategoryRow);
  return noStoreJson(await withOptionalCounts(normalized));
}

export async function POST(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  try {
    const parsed = categoryCreateSchema.parse(await request.json());
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase غير مُعد. تحققي من متغيرات البيئة." },
        { status: 503 }
      );
    }
    const href =
      parsed.href ??
      (parsed.slug ? resolveCategoryHref({ href: null, slug: parsed.slug }) : null);
    const product_kind =
      parsed.product_kind ?? inferProductKind();
    const body = {
      name_ar: parsed.name_ar,
      slug: parsed.slug,
      parent_id: parsed.parent_id ?? null,
      sort_order: parsed.sort_order ?? 0,
      is_visible: parsed.is_visible ?? true,
      visible_in_navigation: parsed.visible_in_navigation ?? true,
      show_on_homepage: parsed.show_on_homepage ?? true,
      featured_collection: parsed.featured_collection ?? false,
      icon_url: parsed.icon_url ?? null,
      cover_image_url: parsed.cover_image_url ?? null,
      description_ar: parsed.description_ar ?? "",
      href,
      legacy_key: parsed.legacy_key ?? null,
      product_kind,
      seo_title_ar: parsed.seo_title_ar ?? null,
      seo_description_ar: parsed.seo_description_ar ?? null,
      seo_og_image_url: parsed.seo_og_image_url ?? null,
      updated_at: new Date().toISOString(),
    };
    const supabase = await createPrivilegedClient();
    let { data, error } = await supabase
      .from("categories")
      .insert(body)
      .select()
      .single();

    if (
      error &&
      /product_kind|seo_|visible_in_navigation|show_on_homepage|featured_collection|PGRST204|42703/i.test(
        `${error.message}${error.code}`
      )
    ) {
      const legacyBody = {
        name_ar: body.name_ar,
        slug: body.slug,
        parent_id: body.parent_id,
        sort_order: body.sort_order,
        is_visible: body.is_visible,
        icon_url: body.icon_url,
        cover_image_url: body.cover_image_url,
        description_ar: body.description_ar,
        href: body.href,
        legacy_key: body.legacy_key,
        updated_at: body.updated_at,
      };
      const retry = await supabase
        .from("categories")
        .insert(legacyBody)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      const mapped = mapCategoryError(error);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
    revalidateCategoryPaths([
      data?.href,
      data?.slug ? `/${data.slug}` : null,
      data?.slug ? `/category/${data.slug}` : null,
    ]);
    return NextResponse.json(
      data ? normalizeCategoryRow(data as Category) : data
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.issues[0]?.message ?? "بيانات غير صالحة" },
        { status: 400 }
      );
    }
    const mapped = mapCategoryError(e);
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
      return NextResponse.json({ error: "معرّف التصنيف مطلوب" }, { status: 400 });
    }
    const parsed = categoryUpdateSchema.parse(rest);
    if (parsed.parent_id === id) {
      return NextResponse.json(
        { error: "لا يمكن أن يكون التصنيف أباً لنفسه" },
        { status: 400 }
      );
    }
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
    let { data, error } = await supabase
      .from("categories")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (
      error &&
      /product_kind|seo_|visible_in_navigation|show_on_homepage|featured_collection|PGRST204|42703/i.test(
        `${error.message}${error.code}`
      )
    ) {
      const cleaned = { ...body } as Record<string, unknown>;
      delete cleaned.product_kind;
      delete cleaned.seo_title_ar;
      delete cleaned.seo_description_ar;
      delete cleaned.seo_og_image_url;
      delete cleaned.visible_in_navigation;
      delete cleaned.show_on_homepage;
      delete cleaned.featured_collection;
      const retry = await supabase
        .from("categories")
        .update({ ...cleaned, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      const mapped = mapCategoryError(error);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
    revalidateCategoryPaths([
      data?.href,
      data?.slug ? `/${data.slug}` : null,
      data?.slug ? `/category/${data.slug}` : null,
    ]);
    return NextResponse.json(
      data ? normalizeCategoryRow(data as Category) : data
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.issues[0]?.message ?? "بيانات غير صالحة" },
        { status: 400 }
      );
    }
    const mapped = mapCategoryError(e);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}

export async function DELETE(request: Request) {
  const { user, error: authError } = await requireAdminApi();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "معرّف التصنيف مطلوب" }, { status: 400 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase غير مُعد. تحققي من متغيرات البيئة." },
      { status: 503 }
    );
  }

  const supabase = await createPrivilegedClient();
  const permanent =
    searchParams.get("permanent") === "1" ||
    searchParams.get("permanent") === "true";

  if (!permanent) {
    const { data: catRow, error: catFetchError } = await supabase
      .from("categories")
      .select("id, legacy_key, slug, name_ar")
      .eq("id", id)
      .maybeSingle();
    if (catFetchError) {
      const mapped = mapCategoryError(catFetchError);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
    if (catRow) {
      const productCount = await countDressesForCategory(catRow);
      if (productCount > 0) {
        return NextResponse.json(
          {
            error: `لا يمكن حذف التصنيف «${catRow.name_ar}» لأنه مرتبط بـ ${productCount} منتج. انقلي المنتجات إلى تصنيف آخر أولاً.`,
            product_count: productCount,
          },
          { status: 400 }
        );
      }
    }

    const { count, error: childError } = await supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", id)
      .eq("is_deleted", false);
    if (
      childError &&
      !/is_deleted/i.test(childError.message) &&
      childError.code !== "PGRST204" &&
      childError.code !== "42703"
    ) {
      const mapped = mapCategoryError(childError);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
    let childCount = count ?? 0;
    if (
      childError &&
      /is_deleted|PGRST204|42703/i.test(`${childError.message}${childError.code}`)
    ) {
      const retry = await supabase
        .from("categories")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", id);
      if (retry.error) {
        const mapped = mapCategoryError(retry.error);
        return NextResponse.json({ error: mapped.message }, { status: mapped.status });
      }
      childCount = retry.count ?? 0;
    }
    if (childCount > 0) {
      return NextResponse.json(
        { error: "احذفي التصنيفات الفرعية أولاً قبل حذف هذا التصنيف" },
        { status: 400 }
      );
    }
  }

  const { handleModuleDelete } = await import("@/lib/admin/soft-delete-api");
  const response = await handleModuleDelete({
    request,
    module: "categories",
    actor: { id: user!.id, email: user!.email },
    missingIdMessage: "معرّف التصنيف مطلوب",
  });
  if (response.ok) {
    revalidateCategoryPaths();
  }
  return response;
}
