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
