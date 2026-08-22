import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isMissingColumnError } from "@/lib/supabase/errors";
import { customerKeyFromContact } from "@/lib/customer-auth/otp";
import {
  bookingNotificationKeys,
  type CustomerNotification,
} from "@/lib/notifications/customer-keys";
import type { Booking, BookingStatus } from "@/types";
import {
  SHOP_ORDER_STATUS_LABELS,
  type ShopOrder,
  type ShopOrderStatus,
} from "@/types/shop";

export type { CustomerNotification };
export { bookingNotificationKeys };

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

async function resolveWriteClient(
  client?: InAppWriteClient | null
): Promise<InAppWriteClient> {
  if (client) return client;
  try {
    const { createPrivilegedClient } = await import(
      "@/lib/supabase/privileged"
    );
    return (await createPrivilegedClient()) as InAppWriteClient;
  } catch {
    return createAdminClient() as InAppWriteClient;
  }
}

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
    is_deleted: false,
  };

  try {
    const supabase = await resolveWriteClient(client);
    let { data, error } = await supabase
      .from("customer_notifications")
      .insert(payload)
      .select("*")
      .single();

    if (
      error &&
      /is_deleted|PGRST204|42703/i.test(error.message || "")
    ) {
      const { is_deleted: _drop, ...withoutSoftDelete } = payload;
      ({ data, error } = await supabase
        .from("customer_notifications")
        .insert(withoutSoftDelete)
        .select("*")
        .single());
    }

    if (error) {
      console.error("[customer_notifications] insert failed", error);
      // Last resort so local QA can still see the bell fill
      if (process.env.NODE_ENV !== "production") {
        memoryInbox.unshift(row);
        return row;
      }
      return null;
    }
    return data as CustomerNotification;
  } catch (e) {
    console.error("[customer_notifications] insert error", e);
    if (process.env.NODE_ENV !== "production") {
      memoryInbox.unshift(row);
      return row;
    }
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
 * Writes under the primary customer key plus raw phone/email keys so both
 * Account inbox and guest bell lookups resolve the same event.
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

  const primary =
    input.customerKey?.trim() ||
    customerKeyFromContact(input.booking.phone, input.booking.email) ||
    `booking:${input.booking.id}`;

  // Keep a small stable set — avoid exploding variants on every confirm
  const keys = new Set<string>([primary]);
  const phoneKey = customerKeyFromContact(input.booking.phone, null);
  const emailKey = customerKeyFromContact(null, input.booking.email);
  if (phoneKey) keys.add(phoneKey);
  if (emailKey) keys.add(emailKey);
  keys.add(`booking:${input.booking.id}`);

  let first: CustomerNotification | null = null;
  for (const key of keys) {
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
    const saved = await insertInAppRow(row);
    if (saved && !first) first = saved;
  }
  return first;
}

export async function listInAppNotifications(params: {
  orderId?: string | null;
  customerKey?: string | null;
  customerKeys?: string[] | null;
  limit?: number;
}): Promise<CustomerNotification[]> {
  const limit = params.limit ?? 30;
  const keys = [
    ...(params.customerKeys ?? []),
    ...(params.customerKey ? [params.customerKey] : []),
  ].filter((k, i, arr) => Boolean(k) && arr.indexOf(k) === i);

  if (!isSupabaseConfigured()) {
    return memoryInbox
      .filter((n) => {
        if (params.orderId && n.order_id === params.orderId) return true;
        if (keys.length && n.customer_key && keys.includes(n.customer_key))
          return true;
        return false;
      })
      .slice(0, limit);
  }

  try {
    const supabase = createAdminClient();

    const buildQuery = () => {
      let q = supabase
        .from("customer_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (params.orderId && keys.length) {
        const keyList = keys.map((k) => `"${k.replace(/"/g, "")}"`).join(",");
        q = q.or(
          `order_id.eq.${params.orderId},customer_key.in.(${keyList})`
        );
      } else if (params.orderId) {
        q = q.eq("order_id", params.orderId);
      } else if (keys.length === 1) {
        q = q.eq("customer_key", keys[0]);
      } else if (keys.length > 1) {
        q = q.in("customer_key", keys);
      }

      return q.not("is_deleted", "eq", true);
    };

    if (!params.orderId && keys.length === 0) return [];

    const { data, error } = await buildQuery();

    const rows = ((data as CustomerNotification[]) ?? []).filter(
      (n) => (n as { is_deleted?: boolean | null }).is_deleted !== true
    );

    if (error) {
      console.error("[customer_notifications] list failed", error);
      if (keys.length) {
        const retry = await supabase
          .from("customer_notifications")
          .select("*")
          .in("customer_key", keys)
          .order("created_at", { ascending: false })
          .limit(limit);
        if (!retry.error) {
          const retryRows = (
            (retry.data as CustomerNotification[]) ?? []
          ).filter(
            (n) => (n as { is_deleted?: boolean | null }).is_deleted !== true
          );
          return mergeMemoryFallback(
            retryRows,
            params.orderId,
            keys,
            limit
          );
        }
      }
      return mergeMemoryFallback([], params.orderId, keys, limit);
    }
    return mergeMemoryFallback(rows, params.orderId, keys, limit);
  } catch (e) {
    console.error("[customer_notifications] list error", e);
    return mergeMemoryFallback([], params.orderId, keys, limit);
  }
}

function mergeMemoryFallback(
  rows: CustomerNotification[],
  orderId: string | null | undefined,
  keys: string[],
  limit: number
): CustomerNotification[] {
  if (process.env.NODE_ENV === "production" || memoryInbox.length === 0) {
    return rows.slice(0, limit);
  }
  const fromMem = memoryInbox.filter((n) => {
    if (orderId && n.order_id === orderId) return true;
    if (keys.length && n.customer_key && keys.includes(n.customer_key))
      return true;
    return false;
  });
  const seen = new Set(rows.map((r) => r.id));
  const merged = [...rows];
  for (const n of fromMem) {
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    merged.push(n);
  }
  return merged
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, limit);
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

function notificationEventSig(n: {
  title_ar: string;
  body_ar: string;
  order_status: string | null;
}): string {
  return `${n.title_ar}|${n.order_status ?? ""}|${n.body_ar.slice(0, 80)}`;
}

async function persistNotificationClear(
  execute: (
    action: "soft" | "hard"
  ) => PromiseLike<{ error: { message?: string } | null }>
): Promise<void> {
  const soft = await execute("soft");
  if (soft.error && isMissingColumnError(soft.error, "is_deleted")) {
    await execute("hard");
    return;
  }
  if (soft.error) {
    console.error("[customer_notifications] clear failed", soft.error);
  }
}

/**
 * Soft-delete in-app rows (`is_deleted`). Falls back to hard delete if the
 * lifecycle column is not applied yet. Duplicate booking copies that share
 * the same event title under the same keys / order are cleared together.
 */
export async function clearInAppNotifications(input: {
  ids?: string[];
  clearAll?: boolean;
  orderId?: string | null;
  customerKeys?: string[];
}): Promise<boolean> {
  const ids = [
    ...new Set((input.ids ?? []).map((id) => id.trim()).filter(Boolean)),
  ];
  const keys = [
    ...new Set((input.customerKeys ?? []).map((k) => k.trim()).filter(Boolean)),
  ];
  const orderId = input.orderId?.trim() || null;
  const clearAll = Boolean(input.clearAll);

  if (!clearAll && ids.length === 0) return false;

  const sigs = new Set<string>();
  for (const n of memoryInbox) {
    if (ids.includes(n.id)) sigs.add(notificationEventSig(n));
  }
  for (let i = memoryInbox.length - 1; i >= 0; i--) {
    const n = memoryInbox[i];
    const idMatch = ids.includes(n.id);
    const keyMatch = Boolean(n.customer_key && keys.includes(n.customer_key));
    const orderMatch = Boolean(orderId && n.order_id === orderId);
    const sigMatch =
      sigs.has(notificationEventSig(n)) && (keyMatch || orderMatch || idMatch);
    if (clearAll && (idMatch || keyMatch || orderMatch)) {
      memoryInbox.splice(i, 1);
      continue;
    }
    if (!clearAll && (idMatch || sigMatch)) {
      memoryInbox.splice(i, 1);
    }
  }

  if (!isSupabaseConfigured()) return true;

  try {
    const supabase = createAdminClient();

    if (clearAll) {
      if (ids.length) {
        await persistNotificationClear((action) =>
          action === "soft"
            ? supabase
                .from("customer_notifications")
                .update({ is_deleted: true })
                .in("id", ids)
            : supabase.from("customer_notifications").delete().in("id", ids)
        );
      }
      if (orderId) {
        await persistNotificationClear((action) =>
          action === "soft"
            ? supabase
                .from("customer_notifications")
                .update({ is_deleted: true })
                .eq("order_id", orderId)
            : supabase
                .from("customer_notifications")
                .delete()
                .eq("order_id", orderId)
        );
      }
      if (keys.length) {
        await persistNotificationClear((action) =>
          action === "soft"
            ? supabase
                .from("customer_notifications")
                .update({ is_deleted: true })
                .in("customer_key", keys)
            : supabase
                .from("customer_notifications")
                .delete()
                .in("customer_key", keys)
        );
      }
      return true;
    }

    const { data: rows } = await supabase
      .from("customer_notifications")
      .select("id, title_ar, body_ar, order_status, order_id, customer_key")
      .in("id", ids);

    await persistNotificationClear((action) =>
      action === "soft"
        ? supabase
            .from("customer_notifications")
            .update({ is_deleted: true })
            .in("id", ids)
        : supabase.from("customer_notifications").delete().in("id", ids)
    );

    const seenSig = new Set<string>();
    for (const row of (rows ?? []) as Array<{
      title_ar: string;
      body_ar: string;
      order_status: string | null;
      order_id: string | null;
      customer_key: string | null;
    }>) {
      const sig = notificationEventSig(row);
      if (seenSig.has(sig)) continue;
      seenSig.add(sig);
      const scopedKeys = [
        ...keys,
        ...(row.customer_key ? [row.customer_key] : []),
      ];
      if (row.order_id) {
        await persistNotificationClear((action) => {
          const q =
            action === "soft"
              ? supabase
                  .from("customer_notifications")
                  .update({ is_deleted: true })
              : supabase.from("customer_notifications").delete();
          return q.eq("order_id", row.order_id!).eq("title_ar", row.title_ar);
        });
      }
      if (scopedKeys.length) {
        await persistNotificationClear((action) => {
          const q =
            action === "soft"
              ? supabase
                  .from("customer_notifications")
                  .update({ is_deleted: true })
              : supabase.from("customer_notifications").delete();
          return q
            .in("customer_key", [...new Set(scopedKeys)])
            .eq("title_ar", row.title_ar);
        });
      }
    }
    return true;
  } catch (e) {
    console.error("[customer_notifications] clear error", e);
    return false;
  }
}
