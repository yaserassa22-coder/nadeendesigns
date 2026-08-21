import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import type { GalleryMediaType } from "@/types";

function missingVideoColumn(message: string) {
  return /media_type|video_url|PGRST204|42703/i.test(message);
}

function normalizeGalleryBody(body: Record<string, unknown>) {
  const media_type: GalleryMediaType =
    body.media_type === "video" ? "video" : "image";
  const title_ar = String(body.title_ar ?? "").trim();
  const image_url = String(body.image_url ?? "").trim();
  const video_url = String(body.video_url ?? "").trim();
  const category = String(body.category ?? "details").trim() || "details";
  const sort_order = Math.floor(Number(body.sort_order) || 0);

  if (!title_ar) {
    return { error: "Title is required" as const };
  }
  if (media_type === "image" && !image_url) {
    return { error: "Image is required" as const };
  }
  if (media_type === "video" && !video_url) {
    return { error: "Video is required" as const };
  }

  return {
    payload: {
      title_ar,
      category,
      sort_order,
      media_type,
      image_url: image_url || null,
      video_url: media_type === "video" ? video_url : null,
    },
  };
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json([]);
  }
  const { searchParams } = new URL(request.url);
  const wantAll = searchParams.get("all") === "1";
  if (wantAll) {
    const { error: authError } = await requireAdminApi();
    if (authError) return authError;
  }

  const supabase = wantAll
    ? await createPrivilegedClient()
    : createAdminClient();
  let query = supabase
    .from("gallery_items")
    .select("*")
    .order("sort_order", { ascending: true });
  if (!wantAll) {
    query = query.eq("is_deleted", false).is("archived_at", null);
  }
  const { data, error } = await query;
  if (error) {
    // Pre-migration DBs may lack lifecycle columns — fall back to unfiltered.
    if (/is_deleted|archived_at|PGRST204|42703/i.test(error.message)) {
      const fallback = await createAdminClient()
        .from("gallery_items")
        .select("*")
        .order("sort_order", { ascending: true });
      if (fallback.error) {
        return NextResponse.json(
          { error: fallback.error.message },
          { status: 500 }
        );
      }
      return NextResponse.json(fallback.data);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { error: authError } = await requireAdminApi("canMutateStore");
  if (authError) return authError;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 503 }
      );
    }
    const parsed = normalizeGalleryBody(body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const supabase = await createPrivilegedClient();
    const { data, error } = await supabase
      .from("gallery_items")
      .insert(parsed.payload)
      .select()
      .single();
    if (error) {
      if (parsed.payload.media_type === "video" && missingVideoColumn(error.message)) {
        throw new Error("Run migration 053_gallery_video.sql first.");
      }
      if (missingVideoColumn(error.message)) {
        const { data: fallback, error: fallbackError } = await supabase
          .from("gallery_items")
          .insert({
            title_ar: parsed.payload.title_ar,
            image_url: parsed.payload.image_url,
            category: parsed.payload.category,
            sort_order: parsed.payload.sort_order,
          })
          .select()
          .single();
        if (fallbackError) throw fallbackError;
        return NextResponse.json(fallback);
      }
      throw error;
    }
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const { error: authError } = await requireAdminApi("canMutateStore");
  if (authError) return authError;

  try {
    const { id, ...rest } = (await request.json()) as Record<string, unknown> & {
      id?: string;
    };
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 503 }
      );
    }
    const parsed = normalizeGalleryBody(rest);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const supabase = await createPrivilegedClient();
    const { data, error } = await supabase
      .from("gallery_items")
      .update(parsed.payload)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      if (parsed.payload.media_type === "video" && missingVideoColumn(error.message)) {
        throw new Error("Run migration 053_gallery_video.sql first.");
      }
      if (missingVideoColumn(error.message)) {
        const { data: fallback, error: fallbackError } = await supabase
          .from("gallery_items")
          .update({
            title_ar: parsed.payload.title_ar,
            image_url: parsed.payload.image_url,
            category: parsed.payload.category,
            sort_order: parsed.payload.sort_order,
          })
          .eq("id", id)
          .select()
          .single();
        if (fallbackError) throw fallbackError;
        return NextResponse.json(fallback);
      }
      throw error;
    }
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const { user, error: authError } = await requireAdminApi("canMutateStore");
  if (authError) return authError;

  const { handleModuleDelete } = await import("@/lib/admin/soft-delete-api");
  return handleModuleDelete({
    request,
    module: "gallery",
    actor: { id: user!.id, email: user!.email },
    missingIdMessage: "ID required",
  });
}
