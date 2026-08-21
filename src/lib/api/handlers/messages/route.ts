import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import type { ContactMessage } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  if (!isSupabaseConfigured()) {
    return NextResponse.json([]);
  }

  const supabase = await createPrivilegedClient();

  try {
    const { syncAccountMessagesIntoInbox } = await import(
      "@/lib/admin/account-message-bridge"
    );
    await syncAccountMessagesIntoInbox(supabase);
  } catch (e) {
    console.warn("[messages GET] account sync skipped", e);
  }

  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[messages GET]", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Soft-deleted out; NULL/missing is_deleted kept (legacy rows).
  const rows = ((data ?? []) as ContactMessage[]).filter(
    (m) =>
      (m as ContactMessage & { is_deleted?: boolean | null }).is_deleted !== true
  );
  return NextResponse.json(rows);
}

export async function DELETE(request: Request) {
  const { user, error: authError } = await requireAdminApi("canMutateStore");
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
  const { error: authError } = await requireAdminApi("canMutateStore");
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
