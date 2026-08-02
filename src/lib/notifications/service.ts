import {
  NOTIFICATION_MAX_ATTEMPTS,
  getAdminNotificationEmail,
  isNotificationsEnabled,
  isResendConfigured,
  isWhatsAppConfigured,
} from "@/lib/notifications/config";
import { sendEmail } from "@/lib/notifications/email";
import {
  logNotification,
  updateNotificationLog,
  wasRecentlySent,
} from "@/lib/notifications/log";
import { getNotificationSettings } from "@/lib/notifications/settings";
import {
  adminNewOrderEmail,
  adminWhatsAppMessage,
  customMessageEmail,
  customWhatsAppMessage,
  customerStatusEmail,
  customerWhatsAppMessage,
  paymentRequestEmail,
  paymentRequestWhatsApp,
} from "@/lib/notifications/templates";
import { sendWhatsApp } from "@/lib/notifications/whatsapp";
import {
  CUSTOMER_EMAIL_STATUSES,
  type ShopOrder,
  type ShopOrderStatus,
} from "@/types/shop";

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendWithRetry(
  send: () => Promise<
    | { ok: true; id?: string; sid?: string }
    | { ok: false; error: string }
  >,
  meta: {
    orderId: string;
    customerId?: string | null;
    notificationType: string;
    channel: "email" | "whatsapp";
    orderStatus?: string;
    recipient?: string;
    skipDedupe?: boolean;
  }
) {
  if (!meta.skipDedupe) {
    const dup = await wasRecentlySent({
      orderId: meta.orderId,
      notificationType: meta.notificationType,
      channel: meta.channel,
      orderStatus: meta.orderStatus,
      withinMinutes: 90,
    });
    if (dup) {
      console.info("[notifications] duplicate skipped", meta);
      await logNotification({
        orderId: meta.orderId,
        customerId: meta.customerId,
        notificationType: meta.notificationType,
        channel: meta.channel,
        orderStatus: meta.orderStatus,
        recipient: meta.recipient,
        status: "sent",
        deliveryResult: "skipped_duplicate",
        attempts: 0,
      });
      return { ok: true as const, attempts: 0, skipped: true };
    }
  }

  let lastError = "";
  let attempts = 0;

  for (let i = 1; i <= NOTIFICATION_MAX_ATTEMPTS; i++) {
    attempts = i;
    const result = await send();
    if (result.ok) {
      const delivery =
        ("id" in result && result.id) ||
        ("sid" in result && result.sid) ||
        "ok";
      await logNotification({
        orderId: meta.orderId,
        customerId: meta.customerId,
        notificationType: meta.notificationType,
        channel: meta.channel,
        orderStatus: meta.orderStatus,
        recipient: meta.recipient,
        status: "sent",
        deliveryResult: String(delivery),
        attempts,
      });
      return { ok: true as const, attempts };
    }
    lastError = result.error;
    console.error("[notifications] attempt failed", {
      ...meta,
      attempt: i,
      error: lastError,
    });
    if (i < NOTIFICATION_MAX_ATTEMPTS) {
      await sleep(400 * i);
    }
  }

  await logNotification({
    orderId: meta.orderId,
    customerId: meta.customerId,
    notificationType: meta.notificationType,
    channel: meta.channel,
    orderStatus: meta.orderStatus,
    recipient: meta.recipient,
    status: "failed",
    errorMessage: lastError,
    attempts,
  });

  return { ok: false as const, error: lastError, attempts };
}

function customerKey(order: ShopOrder) {
  return order.email?.trim() || order.phone?.trim() || null;
}

/** Customer email (selected statuses) + WhatsApp (every status). Never throws. */
export async function notifyCustomerOrderStatus(
  order: ShopOrder,
  status: ShopOrderStatus,
  options?: { skipDedupe?: boolean; forceEmail?: boolean }
) {
  if (!isNotificationsEnabled()) {
    console.info("[notifications] disabled — skip customer status", order.id);
    return;
  }

  const settings = await getNotificationSettings();
  const tasks: Promise<unknown>[] = [];
  const sendEmailForStatus =
    options?.forceEmail || CUSTOMER_EMAIL_STATUSES.includes(status);

  if (sendEmailForStatus && order.email && isResendConfigured()) {
    const { subject, html } = customerStatusEmail(order, status, settings);
    tasks.push(
      sendWithRetry(
        () =>
          sendEmail({
            to: order.email!,
            subject,
            html,
            replyTo: settings.reply_email,
            fromName: settings.sender_name,
          }),
        {
          orderId: order.id,
          customerId: customerKey(order),
          notificationType:
            status === "pending"
              ? "customer_order_submitted"
              : "customer_order_status",
          channel: "email",
          orderStatus: status,
          recipient: order.email,
          skipDedupe: options?.skipDedupe,
        }
      )
    );
  } else if (sendEmailForStatus && order.email) {
    await logNotification({
      orderId: order.id,
      customerId: customerKey(order),
      notificationType: "customer_order_status",
      channel: "email",
      orderStatus: status,
      recipient: order.email,
      status: "failed",
      errorMessage: "Resend غير مُعد",
    });
  }

  if (order.phone && isWhatsAppConfigured()) {
    const body = customerWhatsAppMessage(order, status, settings);
    tasks.push(
      sendWithRetry(() => sendWhatsApp({ to: order.phone, body }), {
        orderId: order.id,
        customerId: customerKey(order),
        notificationType:
          status === "pending"
            ? "customer_order_submitted"
            : "customer_order_status",
        channel: "whatsapp",
        orderStatus: status,
        recipient: order.phone,
        skipDedupe: options?.skipDedupe,
      })
    );
  } else if (order.phone) {
    await logNotification({
      orderId: order.id,
      customerId: customerKey(order),
      notificationType: "customer_order_status",
      channel: "whatsapp",
      orderStatus: status,
      recipient: order.phone,
      status: "failed",
      errorMessage: "Twilio WhatsApp غير مُعد",
    });
  }

  await Promise.allSettled(tasks);
}

/** Payment request email + WhatsApp */
export async function notifyPaymentRequest(
  order: ShopOrder,
  amount: number,
  options?: { skipDedupe?: boolean }
) {
  if (!isNotificationsEnabled()) return;

  const settings = await getNotificationSettings();
  const tasks: Promise<unknown>[] = [];

  if (order.email && isResendConfigured()) {
    const { subject, html } = paymentRequestEmail(order, amount, settings);
    tasks.push(
      sendWithRetry(
        () =>
          sendEmail({
            to: order.email!,
            subject,
            html,
            replyTo: settings.reply_email,
            fromName: settings.sender_name,
          }),
        {
          orderId: order.id,
          customerId: customerKey(order),
          notificationType: "customer_payment_request",
          channel: "email",
          orderStatus: "awaiting_payment",
          recipient: order.email,
          skipDedupe: options?.skipDedupe,
        }
      )
    );
  }

  if (order.phone && isWhatsAppConfigured()) {
    const body = paymentRequestWhatsApp(order, amount, settings);
    tasks.push(
      sendWithRetry(() => sendWhatsApp({ to: order.phone, body }), {
        orderId: order.id,
        customerId: customerKey(order),
        notificationType: "customer_payment_request",
        channel: "whatsapp",
        orderStatus: "awaiting_payment",
        recipient: order.phone,
        skipDedupe: options?.skipDedupe,
      })
    );
  }

  await Promise.allSettled(tasks);
}

/** Admin custom message to customer */
export async function sendCustomCustomerMessage(
  order: ShopOrder,
  message: string,
  channels: "whatsapp" | "email" | "both"
) {
  if (!isNotificationsEnabled()) {
    return { ok: false as const, error: "الإشعارات معطّلة" };
  }

  const settings = await getNotificationSettings();
  const tasks: Promise<unknown>[] = [];
  const wantEmail = channels === "email" || channels === "both";
  const wantWa = channels === "whatsapp" || channels === "both";

  if (wantEmail) {
    if (!order.email) {
      await logNotification({
        orderId: order.id,
        customerId: customerKey(order),
        notificationType: "customer_custom_message",
        channel: "email",
        recipient: null,
        status: "failed",
        errorMessage: "لا يوجد بريد للعميلة",
      });
    } else if (isResendConfigured()) {
      const { subject, html } = customMessageEmail(order, message, settings);
      tasks.push(
        sendWithRetry(
          () =>
            sendEmail({
              to: order.email!,
              subject,
              html,
              replyTo: settings.reply_email,
              fromName: settings.sender_name,
            }),
          {
            orderId: order.id,
            customerId: customerKey(order),
            notificationType: "customer_custom_message",
            channel: "email",
            orderStatus: order.status,
            recipient: order.email,
            skipDedupe: true,
          }
        )
      );
    }
  }

  if (wantWa) {
    if (!order.phone) {
      await logNotification({
        orderId: order.id,
        customerId: customerKey(order),
        notificationType: "customer_custom_message",
        channel: "whatsapp",
        recipient: null,
        status: "failed",
        errorMessage: "لا يوجد هاتف للعميلة",
      });
    } else if (isWhatsAppConfigured()) {
      const body = customWhatsAppMessage(order, message, settings);
      tasks.push(
        sendWithRetry(() => sendWhatsApp({ to: order.phone, body }), {
          orderId: order.id,
          customerId: customerKey(order),
          notificationType: "customer_custom_message",
          channel: "whatsapp",
          orderStatus: order.status,
          recipient: order.phone,
          skipDedupe: true,
        })
      );
    }
  }

  await Promise.allSettled(tasks);
  return { ok: true as const };
}

/** Admin email (+ optional WhatsApp) for a newly submitted order. Never throws. */
export async function notifyAdminNewOrder(order: ShopOrder) {
  if (!isNotificationsEnabled()) {
    console.info("[notifications] disabled — skip admin new order", order.id);
    return;
  }

  const settings = await getNotificationSettings();
  const adminEmail = getAdminNotificationEmail() || settings.reply_email;
  const tasks: Promise<unknown>[] = [];

  if (adminEmail && isResendConfigured()) {
    const { subject, html } = adminNewOrderEmail(order, settings);
    tasks.push(
      sendWithRetry(
        () =>
          sendEmail({
            to: adminEmail,
            subject,
            html,
            replyTo: settings.reply_email,
            fromName: settings.sender_name,
          }),
        {
          orderId: order.id,
          customerId: customerKey(order),
          notificationType: "admin_new_order",
          channel: "email",
          orderStatus: order.status,
          recipient: adminEmail,
        }
      )
    );
  } else {
    await logNotification({
      orderId: order.id,
      customerId: customerKey(order),
      notificationType: "admin_new_order",
      channel: "email",
      orderStatus: order.status,
      recipient: adminEmail || null,
      status: "failed",
      errorMessage: adminEmail
        ? "Resend غير مُعد"
        : "ADMIN_NOTIFICATION_EMAIL غير مُعد",
    });
  }

  const adminWhatsApp = process.env.ADMIN_WHATSAPP_TO?.trim();
  if (adminWhatsApp && isWhatsAppConfigured()) {
    const body = adminWhatsAppMessage(order, settings);
    tasks.push(
      sendWithRetry(() => sendWhatsApp({ to: adminWhatsApp, body }), {
        orderId: order.id,
        customerId: customerKey(order),
        notificationType: "admin_new_order",
        channel: "whatsapp",
        orderStatus: order.status,
        recipient: adminWhatsApp,
      })
    );
  }

  await Promise.allSettled(tasks);
}

/** Fired when a new order is created. */
export async function onOrderSubmitted(order: ShopOrder) {
  try {
    await Promise.allSettled([
      notifyCustomerOrderStatus(order, "pending"),
      notifyAdminNewOrder(order),
    ]);
  } catch (e) {
    console.error("[notifications] onOrderSubmitted failed", e);
  }
}

/** Fired when admin changes status (only if actually changed). */
export async function onOrderStatusChanged(
  order: ShopOrder,
  previousStatus: ShopOrderStatus,
  nextStatus: ShopOrderStatus,
  options?: { paymentAmount?: number }
) {
  if (previousStatus === nextStatus) {
    console.info("[notifications] status unchanged — skip", {
      orderId: order.id,
      status: nextStatus,
    });
    return;
  }

  try {
    const nextOrder = { ...order, status: nextStatus };
    if (nextStatus === "awaiting_payment") {
      const amount =
        typeof options?.paymentAmount === "number" && options.paymentAmount > 0
          ? options.paymentAmount
          : Number(order.total) || 0;
      await notifyPaymentRequest(nextOrder, amount);
      // Also send WhatsApp status line if payment request failed channels partially
      return;
    }
    await notifyCustomerOrderStatus(nextOrder, nextStatus);
  } catch (e) {
    console.error("[notifications] onOrderStatusChanged failed", e);
  }
}

export async function retryFailedNotificationLog(log: {
  id: string;
  order_id: string | null;
  channel: "email" | "whatsapp";
  notification_type: string;
  order_status: string | null;
  recipient: string | null;
  attempts: number;
}) {
  await updateNotificationLog(log.id, {
    status: "pending_retry",
    attempts: (log.attempts || 1) + 1,
  });
}
