import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type {
  NotificationChannel,
  NotificationSendStatus,
  NotificationType,
} from "@/types/shop";

export interface LogNotificationInput {
  orderId: string;
  customerId?: string | null;
  notificationType: NotificationType | string;
  channel: NotificationChannel;
  orderStatus?: string | null;
  recipient?: string | null;
  status: NotificationSendStatus;
  deliveryResult?: string | null;
  errorMessage?: string | null;
  attempts?: number;
  payload?: Record<string, unknown> | null;
}

const memoryLogs: Array<
  LogNotificationInput & { id: string; created_at: string }
> = [];

export async function wasRecentlySent(params: {
  orderId: string;
  notificationType: string;
  channel: NotificationChannel;
  orderStatus?: string | null;
  withinMinutes?: number;
}): Promise<boolean> {
  const within = params.withinMinutes ?? 60;
  const since = new Date(Date.now() - within * 60_000).toISOString();

  if (!isSupabaseConfigured()) {
    return memoryLogs.some(
      (l) =>
        l.orderId === params.orderId &&
        l.notificationType === params.notificationType &&
        l.channel === params.channel &&
        (l.orderStatus ?? null) === (params.orderStatus ?? null) &&
        l.status === "sent" &&
        l.created_at >= since
    );
  }

  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("notification_logs")
      .select("id")
      .eq("order_id", params.orderId)
      .eq("notification_type", params.notificationType)
      .eq("channel", params.channel)
      .eq("status", "sent")
      .gte("created_at", since)
      .limit(1);

    if (params.orderStatus) {
      query = query.eq("order_status", params.orderStatus);
    }

    const { data } = await query;
    return Boolean(data && data.length > 0);
  } catch (e) {
    console.error("[notification_logs] dedupe check failed", e);
    return false;
  }
}

export async function logNotification(input: LogNotificationInput) {
  const row = {
    order_id: input.orderId,
    customer_id: input.customerId ?? null,
    notification_type: input.notificationType,
    channel: input.channel,
    order_status: input.orderStatus ?? null,
    recipient: input.recipient ?? null,
    status: input.status,
    delivery_result: input.deliveryResult ?? null,
    error_message: input.errorMessage ?? null,
    attempts: input.attempts ?? 1,
    payload: input.payload ?? null,
    sent_at: input.status === "sent" ? new Date().toISOString() : null,
  };

  if (!isSupabaseConfigured()) {
    memoryLogs.unshift({
      ...input,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    });
    return { id: memoryLogs[0].id };
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("notification_logs")
      .insert(row)
      .select("id")
      .single();
    if (error) {
      console.error("[notification_logs] insert failed", error);
      return null;
    }
    return data;
  } catch (e) {
    console.error("[notification_logs] unexpected", e);
    return null;
  }
}

export async function updateNotificationLog(
  id: string,
  patch: {
    status: NotificationSendStatus;
    errorMessage?: string | null;
    attempts?: number;
    deliveryResult?: string | null;
  }
) {
  if (!isSupabaseConfigured()) return;

  try {
    const supabase = createAdminClient();
    await supabase
      .from("notification_logs")
      .update({
        status: patch.status,
        error_message: patch.errorMessage ?? null,
        attempts: patch.attempts,
        delivery_result: patch.deliveryResult ?? null,
        sent_at: patch.status === "sent" ? new Date().toISOString() : null,
      })
      .eq("id", id);
  } catch (e) {
    console.error("[notification_logs] update failed", e);
  }
}

export async function listFailedNotifications(limit = 25) {
  if (!isSupabaseConfigured()) {
    return memoryLogs.filter(
      (l) => l.status === "failed" || l.status === "pending_retry"
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notification_logs")
    .select("*")
    .in("status", ["failed", "pending_retry"])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[notification_logs] list failed", error);
    return [];
  }
  return data ?? [];
}
