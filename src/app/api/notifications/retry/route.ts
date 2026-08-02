import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import {
  notifyAdminNewOrder,
  notifyCustomerOrderStatus,
} from "@/lib/notifications/service";
import { updateNotificationLog } from "@/lib/notifications/log";
import type { ShopOrder, ShopOrderStatus } from "@/types/shop";

/**
 * Retries failed / pending_retry notification_logs.
 * Body optional: { limit?: number }
 */
export async function POST(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase غير مُعد لإعادة المحاولة" },
      { status: 503 }
    );
  }

  let limit = 20;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body?.limit === "number" && body.limit > 0) {
      limit = Math.min(50, body.limit);
    }
  } catch {
    /* ignore */
  }

  const supabase = await createPrivilegedClient();
  const { data: logs, error } = await supabase
    .from("notification_logs")
    .select("*")
    .in("status", ["failed", "pending_retry"])
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let retried = 0;
  for (const log of logs ?? []) {
    if (!log.order_id) continue;

    const { data: order } = await createAdminClient()
      .from("shop_orders")
      .select("*")
      .eq("id", log.order_id)
      .maybeSingle();

    if (!order) {
      await updateNotificationLog(log.id, {
        status: "failed",
        errorMessage: "الطلب غير موجود لإعادة الإرسال",
        attempts: (log.attempts ?? 1) + 1,
      });
      continue;
    }

    const shopOrder = order as ShopOrder;
    const status = (log.order_status || shopOrder.status) as ShopOrderStatus;

    try {
      if (log.notification_type === "admin_new_order") {
        await notifyAdminNewOrder(shopOrder);
      } else {
        await notifyCustomerOrderStatus(shopOrder, status, {
          skipDedupe: true,
          forceEmail: true,
        });
      }
      // Mark original failed row as pending_retry then leave new log rows from service
      await updateNotificationLog(log.id, {
        status: "pending_retry",
        attempts: (log.attempts ?? 1) + 1,
        errorMessage: "تمت إعادة المحاولة — راجعي السجلات الجديدة",
      });
      retried += 1;
    } catch (e) {
      await updateNotificationLog(log.id, {
        status: "failed",
        attempts: (log.attempts ?? 1) + 1,
        errorMessage: e instanceof Error ? e.message : "فشل إعادة المحاولة",
      });
    }
  }

  return NextResponse.json({
    success: true,
    scanned: logs?.length ?? 0,
    retried,
  });
}
