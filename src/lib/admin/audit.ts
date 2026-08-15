import type { SupabaseClient } from "@supabase/supabase-js";
import type { LifecycleAction, LifecycleModule } from "@/lib/admin/lifecycle-types";
import { isMissingTableError } from "@/lib/supabase/errors";

export async function writeAuditLog(
  supabase: SupabaseClient,
  input: {
    module: LifecycleModule;
    recordId: string;
    action: LifecycleAction;
    actorId?: string | null;
    actorEmail?: string | null;
    meta?: Record<string, unknown>;
    ipAddress?: string | null;
  }
): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    module: input.module,
    record_id: input.recordId,
    action: input.action,
    actor_id: input.actorId ?? null,
    actor_email: input.actorEmail ?? null,
    meta: input.meta ?? {},
    ip_address: input.ipAddress ?? null,
  });
  if (error) {
    if (isMissingTableError(error, "audit_logs")) {
      console.warn("[audit] audit_logs table missing — run APPLY_SOFT_DELETE_ARCHIVE.sql");
      return;
    }
    console.error("[audit] write failed", error);
  }
}

const AUDIT_LOG_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MAX_AUDIT_LOG_DELETE = 200;

export function parseAuditLogIds(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const ids = [
    ...new Set(
      raw
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.trim())
        .filter((id) => AUDIT_LOG_ID_RE.test(id))
    ),
  ];
  if (ids.length === 0 || ids.length > MAX_AUDIT_LOG_DELETE) return null;
  return ids;
}

export async function deleteAuditLogs(
  supabase: SupabaseClient,
  ids: string[]
): Promise<{ deleted: number; error?: string }> {
  const { data, error } = await supabase
    .from("audit_logs")
    .delete()
    .in("id", ids)
    .select("id");
  if (error) {
    if (isMissingTableError(error, "audit_logs")) {
      return {
        deleted: 0,
        error:
          "جدول audit_logs غير موجود. نفّذي supabase/APPLY_SOFT_DELETE_ARCHIVE.sql",
      };
    }
    return { deleted: 0, error: error.message };
  }
  return { deleted: (data ?? []).length };
}
