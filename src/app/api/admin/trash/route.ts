import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import {
  emptyTrash,
  isLifecycleModule,
  listTrashItems,
  permanentDeleteRecord,
  restoreRecord,
} from "@/lib/admin/lifecycle";
import {
  canEmptyTrash,
  canPermanentDelete,
  canRestore,
} from "@/lib/admin/permissions";
import { MODULE_LABEL_AR } from "@/lib/admin/lifecycle-types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";

export async function GET(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ items: [], modules: MODULE_LABEL_AR });
  }

  const moduleParam = new URL(request.url).searchParams.get("module");
  const lifecycleModule =
    moduleParam && isLifecycleModule(moduleParam) ? moduleParam : undefined;

  const supabase = await createPrivilegedClient();
  const { items, error } = await listTrashItems(supabase, lifecycleModule);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  return NextResponse.json({
    items,
    modules: MODULE_LABEL_AR,
    count: items.length,
  });
}

type TrashBody = {
  action?: string;
  module?: string;
  id?: string;
  ids?: string[];
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

  let body: TrashBody;
  try {
    body = (await request.json()) as TrashBody;
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح" }, { status: 400 });
  }

  const actor = {
    id: user!.id,
    email: user!.email,
    role: "admin",
  };

  const supabase = await createPrivilegedClient();
  const action = body.action;

  if (action === "empty") {
    if (!canEmptyTrash(actor)) {
      return NextResponse.json({ error: "غير مصرح بتفريغ السلة" }, { status: 403 });
    }
    const lifecycleModule =
      body.module && isLifecycleModule(body.module) ? body.module : undefined;
    const result = await emptyTrash(supabase, actor, lifecycleModule);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }
    return NextResponse.json({ success: true, deleted: result.deleted });
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

  if (action === "restore") {
    if (!canRestore(actor)) {
      return NextResponse.json({ error: "غير مصرح بالاستعادة" }, { status: 403 });
    }
    const results = [];
    for (const id of ids) {
      const result = await restoreRecord(supabase, body.module, id, actor);
      results.push(result.ok ? { id, ok: true } : { id, ok: false, error: result.error });
    }
    return NextResponse.json({ success: true, action: "restore", results });
  }

  if (action === "permanent_delete") {
    if (!canPermanentDelete(actor)) {
      return NextResponse.json(
        { error: "غير مصرح بالحذف النهائي" },
        { status: 403 }
      );
    }
    const results = [];
    for (const id of ids) {
      const result = await permanentDeleteRecord(
        supabase,
        body.module,
        id,
        actor
      );
      results.push(
        result.ok ? { id, ok: true } : { id, ok: false, error: result.error }
      );
    }
    const failed = results.filter((r) => !r.ok);
    if (failed.length === ids.length) {
      return NextResponse.json(
        { error: failed[0]?.error || "فشل الحذف النهائي", results },
        { status: 409 }
      );
    }
    return NextResponse.json({
      success: true,
      action: "permanent_delete",
      results,
    });
  }

  return NextResponse.json(
    {
      error:
        "إجراء غير صالح. استخدم: restore | permanent_delete | empty",
    },
    { status: 400 }
  );
}
