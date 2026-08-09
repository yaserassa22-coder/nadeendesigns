import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { isMissingWornByYouTableError } from "@/lib/home/worn-by-you";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import type { WornByYouMediaType, WornByYouProductKind } from "@/types";

type WornByYouBody = {
  id?: string;
  media_type?: WornByYouMediaType;
  image_url?: string;
  video_url?: string | null;
  customer_name?: string | null;
  caption?: string | null;
  alt_text?: string | null;
  product_kind?: WornByYouProductKind | null;
  product_id?: string | null;
  product_label?: string | null;
  social_url?: string | null;
  is_active?: boolean;
  sort_order?: number;
};

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizePayload(body: WornByYouBody) {
  const media_type: WornByYouMediaType =
    body.media_type === "video" ? "video" : "image";
  const image_url = (body.image_url ?? "").trim();
  const video_url = emptyToNull(body.video_url);

  if (media_type === "image" && !image_url) {
    throw new Error("Image is required");
  }
  if (media_type === "video" && !video_url) {
    throw new Error("Video URL is required for video items");
  }

  let product_kind = body.product_kind ?? null;
  if (
    product_kind &&
    product_kind !== "dress" &&
    product_kind !== "veil" &&
    product_kind !== "bridal_robe"
  ) {
    product_kind = null;
  }
  const product_id = emptyToNull(body.product_id);
  if (!product_id) product_kind = null;

  return {
    media_type,
    // Poster optional for video — empty when absent.
    image_url: image_url || "",
    video_url: media_type === "video" ? video_url : null,
    customer_name: emptyToNull(body.customer_name),
    caption: emptyToNull(body.caption),
    alt_text: emptyToNull(body.alt_text),
    product_kind,
    product_id,
    product_label: emptyToNull(body.product_label),
    social_url: emptyToNull(body.social_url),
    is_active: body.is_active !== false,
    sort_order: Number.isFinite(Number(body.sort_order))
      ? Number(body.sort_order)
      : 0,
    updated_at: new Date().toISOString(),
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
    .from("worn_by_you_items")
    .select("*")
    .order("sort_order", { ascending: true });
  if (!wantAll) {
    query = query
      .eq("is_deleted", false)
      .is("archived_at", null)
      .eq("is_active", true);
  }
  const { data, error } = await query;
  if (error) {
    if (isMissingWornByYouTableError(error.message)) {
      return NextResponse.json([]);
    }
    if (/is_deleted|archived_at|PGRST204|42703/i.test(error.message)) {
      const fallback = await createAdminClient()
        .from("worn_by_you_items")
        .select("*")
        .order("sort_order", { ascending: true });
      if (fallback.error) {
        if (isMissingWornByYouTableError(fallback.error.message)) {
          return NextResponse.json([]);
        }
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
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 503 }
      );
    }
    const body = (await request.json()) as WornByYouBody;
    const row = normalizePayload(body);
    const supabase = await createPrivilegedClient();
    const { data, error } = await supabase
      .from("worn_by_you_items")
      .insert(row)
      .select()
      .single();
    if (error) {
      if (isMissingWornByYouTableError(error.message)) {
        return NextResponse.json(
          {
            error:
              "Run migration 048_worn_by_you.sql before adding Worn by You items.",
          },
          { status: 503 }
        );
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
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 503 }
      );
    }
    const body = (await request.json()) as WornByYouBody;
    const { id, ...rest } = body;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    const row = normalizePayload(rest);
    const supabase = await createPrivilegedClient();
    const { data, error } = await supabase
      .from("worn_by_you_items")
      .update(row)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      if (isMissingWornByYouTableError(error.message)) {
        return NextResponse.json(
          {
            error:
              "Run migration 048_worn_by_you.sql before editing Worn by You items.",
          },
          { status: 503 }
        );
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
    module: "worn_by_you",
    actor: { id: user!.id, email: user!.email },
    missingIdMessage: "ID required",
  });
}
