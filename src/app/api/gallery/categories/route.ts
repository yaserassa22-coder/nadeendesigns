import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import {
  slugifyGalleryCategory,
  type GalleryCategory,
} from "@/lib/gallery/categories";
import { getAdminGalleryCategories } from "@/lib/data/gallery-categories";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";

function normalizeBody(body: Record<string, unknown>) {
  const label_ar = String(body.label_ar ?? "").trim();
  const label_he = String(body.label_he ?? "").trim();
  const label_en = String(body.label_en ?? "").trim();
  const slugRaw = (String(body.slug ?? "").trim() || label_en || label_ar).trim();
  const slug = slugifyGalleryCategory(slugRaw);
  const sort_order = Math.floor(Number(body.sort_order) || 0);
  const is_active = body.is_active !== false && body.is_active !== "false";
  return { slug, label_ar, label_he, label_en, sort_order, is_active };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const admin = searchParams.get("admin") === "1";
  if (admin) {
    const { error: authError } = await requireAdminApi();
    if (authError) return authError;
    const rows = await getAdminGalleryCategories();
    return NextResponse.json(rows);
  }
  const { getGalleryCategories } = await import("@/lib/data/gallery-categories");
  const rows = await getGalleryCategories();
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const { error: authError } = await requireAdminApi("canMutateStore");
  if (authError) return authError;

  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 503 }
      );
    }
    const body = (await request.json()) as Record<string, unknown>;
    const row = normalizeBody(body);
    if (!row.slug || !row.label_ar) {
      return NextResponse.json(
        { error: "Slug and Arabic label are required" },
        { status: 400 }
      );
    }
    const supabase = await createPrivilegedClient();
    const { data, error } = await supabase
      .from("gallery_categories")
      .insert({
        ...row,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data as GalleryCategory);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const { error: authError } = await requireAdminApi("canMutateStore");
  if (authError) return authError;

  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 503 }
      );
    }
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    const row = normalizeBody(body);
    if (!row.slug || !row.label_ar) {
      return NextResponse.json(
        { error: "Slug and Arabic label are required" },
        { status: 400 }
      );
    }
    const supabase = await createPrivilegedClient();
    const { data, error } = await supabase
      .from("gallery_categories")
      .update({
        ...row,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data as GalleryCategory);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const { error: authError } = await requireAdminApi("canMutateStore");
  if (authError) return authError;

  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 503 }
      );
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim() || "";
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    const supabase = await createPrivilegedClient();
    const { error } = await supabase
      .from("gallery_categories")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
