/**
 * Commerce event logging + settings audit trail.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type CommerceLogCategory =
  | "payment"
  | "payment_failed"
  | "refund"
  | "invoice"
  | "invoice_failed"
  | "webhook"
  | "api_error"
  | "settings_audit";

export type CommerceLogLevel = "info" | "warn" | "error";

export type CommerceLogInput = {
  category: CommerceLogCategory;
  level?: CommerceLogLevel;
  providerId?: string | null;
  orderId?: string | null;
  transactionId?: string | null;
  message: string;
  details?: Record<string, unknown>;
};

const memoryLogs: Array<CommerceLogInput & { id: string; created_at: string }> =
  [];

export async function logCommerceEvent(
  input: CommerceLogInput
): Promise<void> {
  const row = {
    category: input.category,
    level: input.level ?? "info",
    provider_id: input.providerId ?? null,
    order_id: input.orderId ?? null,
    transaction_id: input.transactionId ?? null,
    message: input.message,
    details: input.details ?? {},
  };

  memoryLogs.unshift({
    ...input,
    id: `mem-${Date.now()}`,
    created_at: new Date().toISOString(),
  });
  if (memoryLogs.length > 500) memoryLogs.length = 500;

  if (!isSupabaseConfigured()) return;

  try {
    const supabase = createAdminClient();
    await supabase.from("commerce_event_logs").insert(row);
  } catch (e) {
    console.error("[commerce] log insert failed", e);
  }
}

export async function listCommerceLogs(opts?: {
  category?: CommerceLogCategory;
  limit?: number;
}): Promise<
  Array<{
    id: string;
    category: string;
    level: string;
    provider_id: string | null;
    order_id: string | null;
    transaction_id: string | null;
    message: string;
    details: Record<string, unknown>;
    created_at: string;
  }>
> {
  const limit = Math.min(200, Math.max(1, opts?.limit ?? 50));

  if (!isSupabaseConfigured()) {
    return memoryLogs
      .filter((l) => !opts?.category || l.category === opts.category)
      .slice(0, limit)
      .map((l) => ({
        id: l.id,
        category: l.category,
        level: l.level ?? "info",
        provider_id: l.providerId ?? null,
        order_id: l.orderId ?? null,
        transaction_id: l.transactionId ?? null,
        message: l.message,
        details: l.details ?? {},
        created_at: l.created_at,
      }));
  }

  try {
    const supabase = createAdminClient();
    let q = supabase
      .from("commerce_event_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (opts?.category) q = q.eq("category", opts.category);
    const { data, error } = await q;
    if (error || !data) return [];
    return data as Array<{
      id: string;
      category: string;
      level: string;
      provider_id: string | null;
      order_id: string | null;
      transaction_id: string | null;
      message: string;
      details: Record<string, unknown>;
      created_at: string;
    }>;
  } catch {
    return [];
  }
}

export async function auditSettingsChange(params: {
  actorId?: string | null;
  actorEmail?: string | null;
  area: "payments" | "invoicing";
  message: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  await logCommerceEvent({
    category: "settings_audit",
    level: "info",
    message: params.message,
    details: {
      area: params.area,
      actorId: params.actorId ?? null,
      actorEmail: params.actorEmail ?? null,
      ...(params.details ?? {}),
    },
  });
}
