import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { customerKeyFromContact } from "@/lib/customer-auth/otp";
import type { Booking, BookingStatus } from "@/types";
import {
  SHOP_ORDER_STATUS_LABELS,
  type ShopOrder,
  type ShopOrderStatus,
} from "@/types/shop";

export interface CustomerNotification {
  id: string;
  order_id: string | null;
  customer_key: string | null;
  title_ar: string;
  body_ar: string;
  order_status: string | null;
  href: string | null;
  is_read: boolean;
  created_at: string;
}

const memoryInbox: CustomerNotification[] = [];

/** Align with `/api/account/notifications` + `customers.customer_key`. */
function customerKey(order: ShopOrder) {
  return customerKeyFromContact(order.phone, order.email);
}

export function inAppCopyForStatus(
  order: ShopOrder,
  status: ShopOrderStatus
): { title_ar: string; body_ar: string } {
  const label = SHOP_ORDER_STATUS_LABELS[status] ?? status;
  const orderNo = `ND-${order.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

  switch (status) {
    case "pending":
      return {
        title_ar: "تم استلام طلبكِ",
        body_ar: `طلبكِ ${orderNo} وصلنا بنجاح وسنراجعه قريباً.`,
      };
    case "confirmed":
      return {
        title_ar: "تم تأكيد الطلب",
        body_ar: `تم تأكيد طلبكِ ${orderNo}. بدأنا التحضير.`,
      };
    case "ready_for_pickup":
      return {
        title_ar: "طلبكِ جاهز",
        body_ar: `طلبكِ ${orderNo} جاهز للاستلام.`,
      };
    case "shipped":
      return {
        title_ar: "تم شحن الطلب",
        body_ar: `طلبكِ ${orderNo} في الطريق إليكِ.`,
      };
    case "delivered":
      return {
        title_ar: "تم التسليم",
        body_ar: `تم تسليم طلبكِ ${orderNo}. نتمنى أن ينال إعجابكِ.`,
      };
    case "cancelled":
      return {
        title_ar: "تم إلغاء الطلب",
        body_ar: `تم إلغاء طلبكِ ${orderNo}. تواصلي معنا إن احتجتِ مساعدة.`,
      };
    default:
      return {
        title_ar: label,
        body_ar: `تحديث على طلبكِ ${orderNo}: ${label}.`,
      };
  }
}

/** Optional Supabase-like client (privileged / service role) for durable inserts. */
export type InAppWriteClient = {
  from: (table: string) => {
    insert: (values: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => PromiseLike<{
          data: unknown;
          error: { message?: string } | null;
        }>;
      };
    };
  };
};

async function insertInAppRow(
  row: CustomerNotification,
  client?: InAppWriteClient | null
): Promise<CustomerNotification | null> {
  if (!isSupabaseConfigured()) {
    memoryInbox.unshift(row);
    return row;
  }

  const payload = {
    id: row.id,
    order_id: row.order_id,
    customer_key: row.customer_key,
    title_ar: row.title_ar,
    body_ar: row.body_ar,
    order_status: row.order_status,
    href: row.href,
    is_read: false,
  };

  try {
    // Privilege-compatible cast — both admin and service-role clients share this shape.
    const supabase = (client ?? createAdminClient()) as InAppWriteClient;
    const { data, error } = await supabase
      .from("customer_notifications")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("[customer_notifications] insert failed", error);
      // Do NOT pretend success — Account → الإشعارات reads the DB, not memory.
      return null;
    }
    return data as CustomerNotification;
  } catch (e) {
    console.error("[customer_notifications] insert error", e);
    return null;
  }
}

export async function createInAppNotification(input: {
  order: ShopOrder;
  status: ShopOrderStatus;
}): Promise<CustomerNotification | null> {
  const { title_ar, body_ar } = inAppCopyForStatus(input.order, input.status);
  const row: CustomerNotification = {
    id: crypto.randomUUID(),
    order_id: input.order.id,
    customer_key: customerKey(input.order),
    title_ar,
    body_ar,
    order_status: input.status,
    href: `/orders/${input.order.id}`,
    is_read: false,
    created_at: new Date().toISOString(),
  };
  return insertInAppRow(row);
}

/**
 * Generic account inbox row (messages, boutique replies, non-order events).
 * `customer_key` must match `customerKeyFromContact` / `customers.customer_key`.
 * Pass the same privileged Supabase client used for `customer_messages` when available.
 */
export async function createAccountInAppNotification(input: {
  customerKey: string;
  title_ar: string;
  body_ar: string;
  href?: string | null;
  order_status?: string | null;
  /** Prefer the writer’s privileged client so insert credentials match the message write. */
  client?: InAppWriteClient | null;
}): Promise<CustomerNotification | null> {
  const key = input.customerKey.trim();
  if (!key) return null;
  const row: CustomerNotification = {
    id: crypto.randomUUID(),
    order_id: null,
    customer_key: key,
    title_ar: input.title_ar,
    body_ar: input.body_ar,
    order_status: input.order_status ?? null,
    href: input.href ?? "/account/messages",
    is_read: false,
    created_at: new Date().toISOString(),
  };
  return insertInAppRow(row, input.client);
}

export function inAppCopyForBookingStatus(
  status: BookingStatus | string,
  bodyPreview?: string
): { title_ar: string; body_ar: string } {
  const preview = (bodyPreview || "").trim().slice(0, 280);
  switch (status) {
    case "confirmed":
      return {
        title_ar: "تم تأكيد موعدكِ",
        body_ar: preview || "تم تأكيد موعدكِ بنجاح. نتطلع لاستقبالكِ.",
      };
    case "rescheduled":
      return {
        title_ar: "تحديث موعدكِ",
        body_ar: preview || "يرجى اختيار موعد آخر — تواصلي معنا إن احتجتِ مساعدة.",
      };
    case "cancelled":
      return {
        title_ar: "تم إلغاء الموعد",
        body_ar: preview || "تم إلغاء الموعد. تواصلي معنا لترتيب وقت آخر.",
      };
    case "completed":
      return {
        title_ar: "شكراً لزيارتكِ",
        body_ar: preview || "شكراً لزيارتكِ NadEEN Designs.",
      };
    default:
      return {
        title_ar: "تحديث على موعدكِ",
        body_ar: preview || "هناك تحديث على موعدكِ في الحساب.",
      };
  }
}

/**
 * Booking confirmations cannot use order_id (FK → shop_orders).
 * Persist via customer_key + href=/account/appointments.
 */
export async function createBookingInAppNotification(input: {
  booking: Pick<Booking, "id" | "phone" | "email" | "name">;
  status: BookingStatus | string;
  bodyPreview?: string;
  customerKey?: string | null;
}): Promise<CustomerNotification | null> {
  const { title_ar, body_ar } = inAppCopyForBookingStatus(
    input.status,
    input.bodyPreview
  );
  const key =
    input.customerKey ||
    customerKeyFromContact(input.booking.phone, input.booking.email);

  const row: CustomerNotification = {
    id: crypto.randomUUID(),
    order_id: null,
    customer_key: key,
    title_ar,
    body_ar,
    order_status: input.status,
    href: "/account/appointments",
    is_read: false,
    created_at: new Date().toISOString(),
  };
  return insertInAppRow(row);
}

export async function listInAppNotifications(params: {
  orderId?: string | null;
  customerKey?: string | null;
  limit?: number;
}): Promise<CustomerNotification[]> {
  const limit = params.limit ?? 30;

  if (!isSupabaseConfigured()) {
    return memoryInbox
      .filter((n) => {
        if (params.orderId && n.order_id === params.orderId) return true;
        if (params.customerKey && n.customer_key === params.customerKey)
          return true;
        return false;
      })
      .slice(0, limit);
  }

  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("customer_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (params.orderId && params.customerKey) {
      query = query.or(
        `order_id.eq.${params.orderId},customer_key.eq.${params.customerKey}`
      );
    } else if (params.orderId) {
      query = query.eq("order_id", params.orderId);
    } else if (params.customerKey) {
      query = query.eq("customer_key", params.customerKey);
    } else {
      return [];
    }

    const { data, error } = await query;
    if (error) {
      console.error("[customer_notifications] list failed", error);
      return memoryInbox.slice(0, limit);
    }
    return (data as CustomerNotification[]) ?? [];
  } catch (e) {
    console.error("[customer_notifications] list error", e);
    return [];
  }
}

export async function markInAppNotificationRead(
  id: string
): Promise<boolean> {
  const idx = memoryInbox.findIndex((n) => n.id === id);
  if (idx >= 0) memoryInbox[idx] = { ...memoryInbox[idx], is_read: true };

  if (!isSupabaseConfigured()) return idx >= 0;

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("customer_notifications")
      .update({ is_read: true })
      .eq("id", id);
    return !error;
  } catch {
    return false;
  }
}

export async function markAllInAppReadForOrder(
  orderId: string
): Promise<void> {
  for (const n of memoryInbox) {
    if (n.order_id === orderId) n.is_read = true;
  }
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = createAdminClient();
    await supabase
      .from("customer_notifications")
      .update({ is_read: true })
      .eq("order_id", orderId)
      .eq("is_read", false);
  } catch (e) {
    console.error("[customer_notifications] mark all failed", e);
  }
}
