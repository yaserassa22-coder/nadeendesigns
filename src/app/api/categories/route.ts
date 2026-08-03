import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { resolveCategoryHref } from "@/lib/categories/href";
import { revalidateCategoryPaths } from "@/lib/categories/revalidate";
import { SEED_CATEGORIES } from "@/types/category";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getErrorMessage,
  isMissingTableError,
} from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { categoryCreateSchema, categoryUpdateSchema } from "@/lib/validations/category";

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

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(SEED_CATEGORIES);
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    if (isMissingTableError(error, "categories")) {
      console.warn("[categories API] table missing — returning seed data");
      return NextResponse.json(SEED_CATEGORIES);
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
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
    const body = {
      name_ar: parsed.name_ar,
      slug: parsed.slug,
      parent_id: parsed.parent_id ?? null,
      sort_order: parsed.sort_order ?? 0,
      is_visible: parsed.is_visible ?? true,
      icon_url: parsed.icon_url ?? null,
      cover_image_url: parsed.cover_image_url ?? null,
      description_ar: parsed.description_ar ?? "",
      href,
      legacy_key: parsed.legacy_key ?? null,
      updated_at: new Date().toISOString(),
    };
    const supabase = await createPrivilegedClient();
    const { data, error } = await supabase
      .from("categories")
      .insert(body)
      .select()
      .single();
    if (error) {
      const mapped = mapCategoryError(error);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
    revalidateCategoryPaths([data?.href, data?.slug ? `/${data.slug}` : null]);
    return NextResponse.json(data);
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
    const { data, error } = await supabase
      .from("categories")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      const mapped = mapCategoryError(error);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
    revalidateCategoryPaths([data?.href, data?.slug ? `/${data.slug}` : null]);
    return NextResponse.json(data);
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
    // Retry without is_deleted filter if column missing
    let childCount = count ?? 0;
    if (childError && /is_deleted|PGRST204|42703/i.test(`${childError.message}${childError.code}`)) {
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
