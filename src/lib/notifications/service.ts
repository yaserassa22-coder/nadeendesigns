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
  bookingSubmittedEmail,
  bookingSubmittedWhatsApp,
  customMessageEmail,
  customWhatsAppMessage,
  customerStatusEmail,
  customerWhatsAppMessage,
  paymentRequestEmail,
  paymentRequestWhatsApp,
} from "@/lib/notifications/templates";
import { sendWhatsApp } from "@/lib/notifications/whatsapp";
import { createInAppNotification } from "@/lib/notifications/in-app";
import {
  CUSTOMER_EMAIL_STATUSES,
  type ShopOrder,
  type ShopOrderStatus,
} from "@/types/shop";
import type { Booking } from "@/types";

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Resolve customer channel prefs; legacy rows without columns → both enabled. */
export function resolveNotifyPrefs(entity: {
  notify_whatsapp?: boolean | null;
  notify_email?: boolean | null;
}) {
  return {
    whatsapp: entity.notify_whatsapp ?? true,
    email: entity.notify_email ?? true,
  };
}

type ChannelSendResult =
  | { ok: true; attempts: number; skipped?: boolean }
  | { ok: false; error: string; attempts: number };

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
): Promise<ChannelSendResult> {
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

function customerKey(order: { email?: string | null; phone?: string | null }) {
  return order.email?.trim() || order.phone?.trim() || null;
}

type CustomerChannelJobs = {
  orderId: string;
  customerId: string | null;
  notificationType: string;
  orderStatus?: string;
  skipDedupe?: boolean;
  prefs: { whatsapp: boolean; email: boolean };
  phone?: string | null;
  email?: string | null;
  sendWhatsAppBody?: () => string;
  sendEmailPayload?: () => {
    subject: string;
    html: string;
    replyTo?: string;
    fromName?: string;
  };
  /** When true, email may send even outside normal email-status rules (WA fallback). */
  emailAllowed: boolean;
};

/**
 * Respects notify prefs:
 * - WhatsApp only / Email only → that channel
 * - Both → WhatsApp first; Email only if WhatsApp fails
 */
async function deliverCustomerPreferredChannels(jobs: CustomerChannelJobs) {
  const wantWa = jobs.prefs.whatsapp && Boolean(jobs.phone?.trim());
  const canEmail =
    jobs.prefs.email &&
    Boolean(jobs.email?.trim()) &&
    Boolean(jobs.sendEmailPayload);

  const runWhatsApp = async (): Promise<ChannelSendResult | null> => {
    if (!wantWa || !jobs.sendWhatsAppBody) return null;
    if (!isWhatsAppConfigured()) {
      await logNotification({
        orderId: jobs.orderId,
        customerId: jobs.customerId,
        notificationType: jobs.notificationType,
        channel: "whatsapp",
        orderStatus: jobs.orderStatus,
        recipient: jobs.phone,
        status: "failed",
        errorMessage: "Twilio WhatsApp غير مُعد",
      });
      return { ok: false, error: "Twilio WhatsApp غير مُعد", attempts: 0 };
    }
    const body = jobs.sendWhatsAppBody();
    return sendWithRetry(() => sendWhatsApp({ to: jobs.phone!, body }), {
      orderId: jobs.orderId,
      customerId: jobs.customerId,
      notificationType: jobs.notificationType,
      channel: "whatsapp",
      orderStatus: jobs.orderStatus,
      recipient: jobs.phone!,
      skipDedupe: jobs.skipDedupe,
    });
  };

  const runEmail = async (): Promise<ChannelSendResult | null> => {
    if (!canEmail || !jobs.sendEmailPayload) return null;
    if (!isResendConfigured()) {
      await logNotification({
        orderId: jobs.orderId,
        customerId: jobs.customerId,
        notificationType: jobs.notificationType,
        channel: "email",
        orderStatus: jobs.orderStatus,
        recipient: jobs.email,
        status: "failed",
        errorMessage: "Resend غير مُعد",
      });
      return { ok: false, error: "Resend غير مُعد", attempts: 0 };
    }
    const payload = jobs.sendEmailPayload();
    return sendWithRetry(
      () =>
        sendEmail({
          to: jobs.email!,
          subject: payload.subject,
          html: payload.html,
          replyTo: payload.replyTo,
          fromName: payload.fromName,
        }),
      {
        orderId: jobs.orderId,
        customerId: jobs.customerId,
        notificationType: jobs.notificationType,
        channel: "email",
        orderStatus: jobs.orderStatus,
        recipient: jobs.email!,
        skipDedupe: jobs.skipDedupe,
      }
    );
  };

  // Both selected → WhatsApp first, Email fallback on failure
  if (jobs.prefs.whatsapp && jobs.prefs.email) {
    const wa = await runWhatsApp();
    if (wa?.ok) return;
    // Email fallback even if status would not normally email
    if (canEmail) {
      await runEmail();
    }
    return;
  }

  if (jobs.prefs.whatsapp) {
    await runWhatsApp();
    return;
  }

  if (jobs.prefs.email && jobs.emailAllowed) {
    await runEmail();
  }
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
  const prefs = resolveNotifyPrefs(order);
  const sendEmailForStatus =
    options?.forceEmail || CUSTOMER_EMAIL_STATUSES.includes(status);
  const notificationType =
    status === "pending"
      ? "customer_order_submitted"
      : "customer_order_status";

  await deliverCustomerPreferredChannels({
    orderId: order.id,
    customerId: customerKey(order),
    notificationType,
    orderStatus: status,
    skipDedupe: options?.skipDedupe,
    prefs,
    phone: order.phone,
    email: order.email,
    emailAllowed: sendEmailForStatus,
    sendWhatsAppBody: () => customerWhatsAppMessage(order, status, settings),
    sendEmailPayload: () => {
      const { subject, html } = customerStatusEmail(order, status, settings);
      return {
        subject,
        html,
        replyTo: settings.reply_email,
        fromName: settings.sender_name,
      };
    },
  });
}

/** Payment request email + WhatsApp */
export async function notifyPaymentRequest(
  order: ShopOrder,
  amount: number,
  options?: { skipDedupe?: boolean }
) {
  if (!isNotificationsEnabled()) return;

  const settings = await getNotificationSettings();
  const prefs = resolveNotifyPrefs(order);

  await deliverCustomerPreferredChannels({
    orderId: order.id,
    customerId: customerKey(order),
    notificationType: "customer_payment_request",
    orderStatus: "awaiting_payment",
    skipDedupe: options?.skipDedupe,
    prefs,
    phone: order.phone,
    email: order.email,
    emailAllowed: true,
    sendWhatsAppBody: () => paymentRequestWhatsApp(order, amount, settings),
    sendEmailPayload: () => {
      const { subject, html } = paymentRequestEmail(order, amount, settings);
      return {
        subject,
        html,
        replyTo: settings.reply_email,
        fromName: settings.sender_name,
      };
    },
  });
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
      createInAppNotification({ order, status: "pending" }),
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
    await createInAppNotification({ order: nextOrder, status: nextStatus });
    if (nextStatus === "awaiting_payment") {
      const amount =
        typeof options?.paymentAmount === "number" && options.paymentAmount > 0
          ? options.paymentAmount
          : Number(order.total) || 0;
      await notifyPaymentRequest(nextOrder, amount);
      return;
    }
    await notifyCustomerOrderStatus(nextOrder, nextStatus);
  } catch (e) {
    console.error("[notifications] onOrderStatusChanged failed", e);
  }
}

/** Booking confirmation respecting channel preferences. */
export async function notifyBookingSubmitted(booking: Booking) {
  if (!isNotificationsEnabled()) {
    console.info(
      "[notifications] disabled — skip booking submitted",
      booking.id
    );
    return;
  }

  const settings = await getNotificationSettings();
  const prefs = resolveNotifyPrefs(booking);

  await deliverCustomerPreferredChannels({
    orderId: booking.id,
    customerId: customerKey(booking),
    notificationType: "customer_booking_submitted",
    orderStatus: "pending",
    prefs,
    phone: booking.phone,
    email: booking.email,
    emailAllowed: true,
    sendWhatsAppBody: () => bookingSubmittedWhatsApp(booking, settings),
    sendEmailPayload: () => {
      const { subject, html } = bookingSubmittedEmail(booking, settings);
      return {
        subject,
        html,
        replyTo: settings.reply_email,
        fromName: settings.sender_name,
      };
    },
  });
}

/** Fired when a new booking is created. */
export async function onBookingSubmitted(booking: Booking) {
  try {
    await notifyBookingSubmitted(booking);
  } catch (e) {
    console.error("[notifications] onBookingSubmitted failed", e);
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
