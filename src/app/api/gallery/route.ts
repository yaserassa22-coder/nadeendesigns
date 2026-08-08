import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";

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
    const body = await request.json();
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 503 }
      );
    }
    const supabase = await createPrivilegedClient();
    const { data, error } = await supabase
      .from("gallery_items")
      .insert(body)
      .select()
      .single();
    if (error) throw error;
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
    const { id, ...rest } = await request.json();
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 503 }
      );
    }
    const supabase = await createPrivilegedClient();
    const { data, error } = await supabase
      .from("gallery_items")
      .update(rest)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
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
