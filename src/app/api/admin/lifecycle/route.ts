import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import {
  archiveRecord,
  isLifecycleModule,
  restoreRecord,
  softDeleteRecord,
  unarchiveRecord,
} from "@/lib/admin/lifecycle";
import {
  canArchive,
  canRestore,
  canSoftDelete,
} from "@/lib/admin/permissions";
import { getAdminActorRole } from "@/lib/admin/reports-data";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";

type LifecycleBody = {
  action?: string;
  module?: string;
  id?: string;
  ids?: string[];
  /** Optional identity for customers overlay upsert (derived order keys). */
  display_name?: string;
  phone?: string | null;
  email?: string | null;
};

export async function POST(request: Request) {
  const { user, error: authError } = await requireAdminApi();
  if (authError) return authError;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase غير مُعد. تحققي من متغيرات البيئة." },
      { status: 503 }
    );
  }

  let body: LifecycleBody;
  try {
    body = (await request.json()) as LifecycleBody;
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح" }, { status: 400 });
  }

  const action = body.action;
  if (
    action !== "archive" &&
    action !== "unarchive" &&
    action !== "soft_delete" &&
    action !== "restore"
  ) {
    return NextResponse.json(
      { error: "إجراء غير صالح. استخدم: archive | unarchive | soft_delete | restore" },
      { status: 400 }
    );
  }

  if (!isLifecycleModule(body.module)) {
    return NextResponse.json({ error: "وحدة غير معروفة" }, { status: 400 });
  }

  const ids = [
    ...(Array.isArray(body.ids) ? body.ids : []),
    ...(body.id ? [body.id] : []),
  ]
    .map((x) => String(x).trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ error: "المعرّف مطلوب" }, { status: 400 });
  }

  const role = await getAdminActorRole(user!.id);
  const actor = {
    id: user!.id,
    email: user!.email,
    role,
  };

  if (action === "archive" && !canArchive(actor)) {
    return NextResponse.json({ error: "غير مصرح بالأرشفة" }, { status: 403 });
  }
  if (action === "soft_delete" && !canSoftDelete(actor)) {
    return NextResponse.json({ error: "غير مصرح بالحذف" }, { status: 403 });
  }
  if (
    (action === "restore" || action === "unarchive") &&
    !canRestore(actor)
  ) {
    return NextResponse.json({ error: "غير مصرح بالاستعادة" }, { status: 403 });
  }

  const supabase = await createPrivilegedClient();
  const results: { id: string; ok: boolean; error?: string }[] = [];
  const customerHint =
    body.module === "customers"
      ? {
          display_name: body.display_name,
          phone: body.phone,
          email: body.email,
        }
      : undefined;

  for (const id of ids) {
    let result;
    if (action === "archive") {
      result = await archiveRecord(
        supabase,
        body.module,
        id,
        actor,
        customerHint
      );
    } else if (action === "unarchive") {
      result = await unarchiveRecord(supabase, body.module, id, actor);
    } else if (action === "soft_delete") {
      if (body.module === "bookings") {
        const { prepareBookingSoftDelete } = await import(
          "@/lib/admin/booking-soft-delete"
        );
        await prepareBookingSoftDelete(supabase, id);
      }
      result = await softDeleteRecord(
        supabase,
        body.module,
        id,
        actor,
        customerHint
      );
    } else {
      result = await restoreRecord(supabase, body.module, id, actor);
    }
    results.push(
      result.ok
        ? { id, ok: true }
        : { id, ok: false, error: result.error }
    );
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length === ids.length) {
    return NextResponse.json(
      { error: failed[0]?.error || "فشلت العملية", results },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    action,
    module: body.module,
    results,
  });
}
