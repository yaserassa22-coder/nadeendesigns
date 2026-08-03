import { NextResponse } from "next/server";
import {
  permanentDeleteRecord,
  softDeleteRecord,
  type LifecycleActor,
} from "@/lib/admin/lifecycle";
import type { LifecycleModule } from "@/lib/admin/lifecycle-types";
import {
  canPermanentDelete,
  canSoftDelete,
} from "@/lib/admin/permissions";
import { getAdminActorRole } from "@/lib/admin/reports-data";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Shared DELETE handler: soft-delete by default; `?permanent=1` for trash.
 */
export async function handleModuleDelete(options: {
  request: Request;
  module: LifecycleModule;
  actor: LifecycleActor;
  idParam?: string;
  missingIdMessage?: string;
}): Promise<NextResponse> {
  const {
    request,
    module,
    actor,
    idParam = "id",
    missingIdMessage = "المعرّف مطلوب",
  } = options;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get(idParam);
  if (!id) {
    return NextResponse.json({ error: missingIdMessage }, { status: 400 });
  }

  const permanent =
    searchParams.get("permanent") === "1" ||
    searchParams.get("permanent") === "true";

  const role = await getAdminActorRole(actor.id);
  const actorWithRole = { ...actor, role };

  if (permanent && !canPermanentDelete(actorWithRole)) {
    return NextResponse.json(
      { error: "غير مصرح بالحذف النهائي" },
      { status: 403 }
    );
  }
  if (!permanent && !canSoftDelete(actorWithRole)) {
    return NextResponse.json(
      { error: "غير مصرح بالحذف" },
      { status: 403 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ success: true, soft: !permanent });
  }

  const supabase = await createPrivilegedClient();
  const result = permanent
    ? await permanentDeleteRecord(supabase, module, id, actor)
    : await softDeleteRecord(supabase, module, id, actor);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({
    success: true,
    soft: !permanent,
    permanent: permanent || undefined,
  });
}
