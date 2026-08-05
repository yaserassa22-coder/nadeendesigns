import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { withNotDeletedFilter } from "@/lib/admin/lifecycle";
import { isMissingColumnError } from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";

export async function GET() {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  if (!isSupabaseConfigured()) {
    return NextResponse.json([]);
  }

  const supabase = await createPrivilegedClient();
  let query = supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });
  query = withNotDeletedFilter(query);

  const { data, error } = await query;
  if (error && (isMissingColumnError(error) || /is_deleted/i.test(error.message))) {
    const retry = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });
    if (retry.error) {
      return NextResponse.json({ error: retry.error.message }, { status: 400 });
    }
    return NextResponse.json(retry.data ?? []);
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data ?? []);
}

export async function DELETE(request: Request) {
  const { user, error: authError } = await requireAdminApi();
  if (authError) return authError;

  const { handleModuleDelete } = await import("@/lib/admin/soft-delete-api");
  return handleModuleDelete({
    request,
    module: "messages",
    actor: { id: user!.id, email: user!.email },
    missingIdMessage: "معرّف الرسالة مطلوب",
  });
}

/** Mark read — keeps contact POST public. */
export async function PATCH(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  const body = (await request.json()) as { id?: string; is_read?: boolean };
  if (!body.id) {
    return NextResponse.json({ error: "معرّف الرسالة مطلوب" }, { status: 400 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true });
  }
  // Privileged client required — anon cannot UPDATE contact_messages under RLS.
  const supabase = await createPrivilegedClient();
  const { error } = await supabase
    .from("contact_messages")
    .update({ is_read: body.is_read ?? true })
    .eq("id", body.id);
  if (error) {
    console.error("[messages PATCH]", error);
    return NextResponse.json(
      {
        error: error.message,
        ...(process.env.NODE_ENV !== "production"
          ? { detail: error.message, code: error.code }
          : {}),
      },
      { status: 400 }
    );
  }
  return NextResponse.json({ success: true });
}
