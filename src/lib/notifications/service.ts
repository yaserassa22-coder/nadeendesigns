import {
  NOTIFICATION_MAX_ATTEMPTS,
  canAttemptEmail,
  getAdminNotificationEmail,
  isNotificationsEnabled,
  isWhatsAppConfigured,
} from "@/lib/notifications/config";
import { sendEmail } from "@/lib/notifications/email";
import { getEmailRuntime } from "@/lib/notifications/email-provider";
import {
  logNotification,
  updateNotificationLog,
  wasRecentlySent,
} from "@/lib/notifications/log";
import { getNotificationSettings } from "@/lib/notifications/settings";
import {
  adminBookingStatusEmail,
  adminBookingStatusWhatsApp,
  adminIntakeAlertEmail,
  adminIntakeAlertWhatsApp,
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
import {
  createBookingInAppNotification,
  createInAppNotification,
} from "@/lib/notifications/in-app";
import { writeBoutiqueAccountReply } from "@/lib/admin/account-message-bridge";
import { customerKeyFromContact } from "@/lib/customer-auth/otp";
import { phoneDigits } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CUSTOMER_EMAIL_STATUSES,
  type ShopOrder,
  type ShopOrderStatus,
} from "@/types/shop";
import type { Booking, BookingStatus } from "@/types";

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
  await getEmailRuntime();
  const wantWa = jobs.prefs.whatsapp && Boolean(jobs.phone?.trim());
  const canEmail =
    jobs.prefs.email &&
    Boolean(jobs.email?.trim()) &&
    Boolean(jobs.sendEmailPayload);

  const runWhatsApp = async (): Promise<ChannelSendResult | null> => {
    if (!wantWa || !jobs.sendWhatsAppBody) return null;
    const body = jobs.sendWhatsAppBody();
    const direct = await sendWhatsApp({ to: jobs.phone!, body });
    if (direct.ok) {
      await logNotification({
        orderId: jobs.orderId,
        customerId: jobs.customerId,
        notificationType: jobs.notificationType,
        channel: "whatsapp",
        orderStatus: jobs.orderStatus,
        recipient: jobs.phone,
        status: "sent",
        deliveryResult: direct.local ? "local_outbox" : direct.sid,
        attempts: 1,
        payload: { local: Boolean(direct.local) },
      });
      return { ok: true, attempts: 1 };
    }
    await logNotification({
      orderId: jobs.orderId,
      customerId: jobs.customerId,
      notificationType: jobs.notificationType,
      channel: "whatsapp",
      orderStatus: jobs.orderStatus,
      recipient: jobs.phone,
      status: "failed",
      errorMessage: direct.error,
      attempts: 1,
    });
    return { ok: false, error: direct.error, attempts: 1 };
  };

  const runEmail = async (): Promise<ChannelSendResult | null> => {
    if (!canEmail || !jobs.sendEmailPayload) return null;
    const { shouldUseLocalNotificationOutbox } = await import(
      "@/lib/notifications/local-outbox"
    );
    if (!canAttemptEmail() && !shouldUseLocalNotificationOutbox()) {
      await logNotification({
        orderId: jobs.orderId,
        customerId: jobs.customerId,
        notificationType: jobs.notificationType,
        channel: "email",
        orderStatus: jobs.orderStatus,
        recipient: jobs.email,
        status: "failed",
        errorMessage: "البريد متوقف أو غير مُعد",
      });
      return { ok: false, error: "البريد متوقف أو غير مُعد", attempts: 0 };
    }
    const payload = jobs.sendEmailPayload();
    const sendResult = await sendEmail({
      to: jobs.email!,
      subject: payload.subject,
      html: payload.html,
      replyTo: payload.replyTo,
      fromName: payload.fromName,
    });
    if (sendResult.ok) {
      await logNotification({
        orderId: jobs.orderId,
        customerId: jobs.customerId,
        notificationType: jobs.notificationType,
        channel: "email",
        orderStatus: jobs.orderStatus,
        recipient: jobs.email,
        status: "sent",
        deliveryResult: sendResult.local ? "local_outbox" : sendResult.id,
        attempts: 1,
        payload: { local: Boolean(sendResult.local) },
      });
      return { ok: true, attempts: 1 };
    }
    await logNotification({
      orderId: jobs.orderId,
      customerId: jobs.customerId,
      notificationType: jobs.notificationType,
      channel: "email",
      orderStatus: jobs.orderStatus,
      recipient: jobs.email,
      status: "failed",
      errorMessage: sendResult.error,
      attempts: 1,
    });
    return { ok: false, error: sendResult.error, attempts: 1 };
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

  await getEmailRuntime();
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
    } else if (canAttemptEmail()) {
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

  await getEmailRuntime();
  const settings = await getNotificationSettings();
  const adminEmail = getAdminNotificationEmail() || settings.reply_email;
  const tasks: Promise<unknown>[] = [];

  if (adminEmail && canAttemptEmail()) {
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
        ? "البريد متوقف أو غير مُعد"
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
    const { maybeIssueInvoiceAfterOrderEvent } = await import(
      "@/lib/shop/issue-invoice"
    );
    await Promise.allSettled([
      createInAppNotification({ order, status: "pending" }),
      notifyCustomerOrderStatus(order, "pending"),
      notifyAdminNewOrder(order),
      maybeIssueInvoiceAfterOrderEvent(order, "submitted"),
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
    if (nextStatus === "payment_received") {
      const { maybeIssueInvoiceAfterOrderEvent } = await import(
        "@/lib/shop/issue-invoice"
      );
      await maybeIssueInvoiceAfterOrderEvent(nextOrder, "payment_received");
    }
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

/** Generic Admin email/WhatsApp for intake (contact, booking, waitlist). Never throws. */
export async function notifyAdminIntake(alert: {
  id: string;
  notificationType: string;
  title: string;
  headline: string;
  lines: Array<{ label: string; value: string }>;
  adminPath: string;
  customerId?: string | null;
}) {
  if (!isNotificationsEnabled()) {
    console.info("[notifications] disabled — skip admin intake", alert.id);
    return;
  }

  await getEmailRuntime();
  const settings = await getNotificationSettings();
  const adminEmail = getAdminNotificationEmail() || settings.reply_email;
  const tasks: Promise<unknown>[] = [];

  if (adminEmail && canAttemptEmail()) {
    const { subject, html } = adminIntakeAlertEmail(alert, settings);
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
          orderId: alert.id,
          customerId: alert.customerId,
          notificationType: alert.notificationType,
          channel: "email",
          orderStatus: "pending",
          recipient: adminEmail,
        }
      )
    );
  } else {
    await logNotification({
      orderId: alert.id,
      customerId: alert.customerId,
      notificationType: alert.notificationType,
      channel: "email",
      orderStatus: "pending",
      recipient: adminEmail || null,
      status: "failed",
      errorMessage: adminEmail
        ? "البريد متوقف أو غير مُعد"
        : "ADMIN_NOTIFICATION_EMAIL غير مُعد",
    });
  }

  const adminWhatsApp = process.env.ADMIN_WHATSAPP_TO?.trim();
  if (adminWhatsApp && isWhatsAppConfigured()) {
    const body = adminIntakeAlertWhatsApp(alert, settings);
    tasks.push(
      sendWithRetry(() => sendWhatsApp({ to: adminWhatsApp, body }), {
        orderId: alert.id,
        customerId: alert.customerId,
        notificationType: alert.notificationType,
        channel: "whatsapp",
        orderStatus: "pending",
        recipient: adminWhatsApp,
      })
    );
  }

  await Promise.allSettled(tasks);
}

/** Fired when a new booking is created. */
export async function onBookingSubmitted(booking: Booking) {
  try {
    const customer = await resolveBookingCustomer(booking);
    const bookingKey =
      customer?.customer_key?.trim() ||
      customerKeyFromContact(
        customer?.phone ?? booking.phone,
        customer?.email ?? booking.email
      ) ||
      customerKeyFromContact(booking.phone, booking.email);

    await Promise.allSettled([
      createBookingInAppNotification({
        booking,
        status: "pending",
        bodyPreview:
          "استلمنا طلب حجزكِ بنجاح وسنراجعه قريباً لتأكيد الموعد.",
        customerKey: bookingKey,
      }),
      notifyBookingSubmitted(booking),
      notifyAdminIntake({
        id: booking.id,
        notificationType: "admin_new_booking",
        title: "حجز جديد",
        headline: "طلب حجز جديد",
        customerId: booking.phone || booking.email,
        adminPath: `/admin/bookings?focus=${encodeURIComponent(booking.id)}`,
        lines: [
          { label: "الاسم", value: booking.name },
          { label: "الهاتف", value: booking.phone },
          { label: "البريد", value: booking.email || "—" },
          { label: "التاريخ", value: booking.date },
          { label: "الوقت", value: booking.time?.slice(0, 5) || "—" },
          { label: "الخدمة", value: booking.service_type },
          ...(booking.notes
            ? [{ label: "ملاحظات", value: booking.notes.slice(0, 500) }]
            : []),
        ],
      }),
    ]);
  } catch (e) {
    console.error("[notifications] onBookingSubmitted failed", e);
  }
}

export type BookingAdminNotifyResult = {
  inApp: boolean;
  account: boolean;
  email: {
    attempted: boolean;
    sent: boolean;
    local?: boolean;
    skippedReason?: string;
    error?: string;
    emailId?: string | null;
  };
  whatsapp: {
    attempted: boolean;
    sent: boolean;
    local?: boolean;
    skippedReason?: string;
    error?: string;
  };
  customerNotified: boolean;
};

type ResolvedBookingCustomer = {
  id: string;
  customer_key: string | null;
  phone: string | null;
  email: string | null;
};

async function resolveBookingCustomer(booking: {
  customer_id?: string | null;
  phone?: string | null;
  email?: string | null;
}): Promise<ResolvedBookingCustomer | null> {
  try {
    const supabase = createAdminClient();
    const select = "id, customer_key, phone, email";

    if (booking.customer_id?.trim()) {
      const { data } = await supabase
        .from("customers")
        .select(select)
        .eq("id", booking.customer_id.trim())
        .maybeSingle();
      if (data?.id) {
        return {
          id: String(data.id),
          customer_key: (data.customer_key as string | null) ?? null,
          phone: (data.phone as string | null) ?? null,
          email: (data.email as string | null) ?? null,
        };
      }
    }

    if (booking.phone?.trim()) {
      const digits = phoneDigits(booking.phone);
      const { data: byPhone } = await supabase
        .from("customers")
        .select(select)
        .eq("phone", booking.phone.trim())
        .limit(1)
        .maybeSingle();
      if (byPhone?.id) {
        return {
          id: String(byPhone.id),
          customer_key: (byPhone.customer_key as string | null) ?? null,
          phone: (byPhone.phone as string | null) ?? null,
          email: (byPhone.email as string | null) ?? null,
        };
      }
      // Digit-normalized fallback (05… vs 972…)
      if (digits.length >= 9) {
        const { data: candidates } = await supabase
          .from("customers")
          .select(select)
          .not("phone", "is", null)
          .limit(200);
        const hit = (candidates ?? []).find((c) => {
          const d = phoneDigits(String(c.phone || ""));
          return (
            d === digits ||
            (d.length >= 9 &&
              digits.length >= 9 &&
              (d.endsWith(digits.slice(-9)) || digits.endsWith(d.slice(-9))))
          );
        });
        if (hit?.id) {
          return {
            id: String(hit.id),
            customer_key: (hit.customer_key as string | null) ?? null,
            phone: (hit.phone as string | null) ?? null,
            email: (hit.email as string | null) ?? null,
          };
        }
      }
    }

    if (booking.email?.trim()) {
      const { data } = await supabase
        .from("customers")
        .select(select)
        .ilike("email", booking.email.trim())
        .limit(1)
        .maybeSingle();
      if (data?.id) {
        return {
          id: String(data.id),
          customer_key: (data.customer_key as string | null) ?? null,
          phone: (data.phone as string | null) ?? null,
          email: (data.email as string | null) ?? null,
        };
      }
    }
  } catch (e) {
    console.warn("[notifications] resolveBookingCustomer failed", e);
  }
  return null;
}

/**
 * After Admin confirms / cancels / reschedules a booking:
 * always create in-app notification; write account thread when possible;
 * deliver WhatsApp + email per prefs (email may be local outbox).
 */
export async function notifyBookingAdminAction(params: {
  booking: Pick<
    Booking,
    | "id"
    | "name"
    | "phone"
    | "email"
    | "date"
    | "time"
    | "service_type"
    | "notify_whatsapp"
    | "notify_email"
    | "customer_id"
  >;
  action: string;
  nextStatus: BookingStatus | string | null;
  subject: string;
  body: string;
  /** When false, skip outbound email (status/in-app/account/WA still run). */
  wantEmail?: boolean;
}): Promise<BookingAdminNotifyResult> {
  const result: BookingAdminNotifyResult = {
    inApp: false,
    account: false,
    email: { attempted: false, sent: false },
    whatsapp: { attempted: false, sent: false },
    customerNotified: false,
  };

  const status =
    params.nextStatus ||
    (params.action === "reply" ? "pending" : String(params.action));
  const prefs = resolveNotifyPrefs(params.booking);

  // Always link/create customer so Account → الإشعارات can resolve the key
  let linkedCustomerId = params.booking.customer_id?.trim() || null;
  if (!linkedCustomerId && params.booking.phone?.trim()) {
    try {
      const { ensureCustomerForCheckout } = await import(
        "@/lib/customer-auth/customer"
      );
      linkedCustomerId = await ensureCustomerForCheckout({
        fullName: params.booking.name || "",
        phone: params.booking.phone,
        email: params.booking.email,
      });
    } catch (e) {
      console.warn("[notifications] ensureCustomerForCheckout", e);
    }
  }

  const customer = await resolveBookingCustomer({
    ...params.booking,
    customer_id: linkedCustomerId,
  });
  // Prefer customers.customer_key so Account → الإشعارات can find the row.
  const key =
    customer?.customer_key?.trim() ||
    customerKeyFromContact(
      customer?.phone ?? params.booking.phone,
      customer?.email ?? params.booking.email
    ) ||
    customerKeyFromContact(params.booking.phone, params.booking.email);

  try {
    const inApp = await createBookingInAppNotification({
      booking: params.booking,
      status,
      bodyPreview: params.body,
      customerKey: key,
    });
    result.inApp = Boolean(inApp);
  } catch (e) {
    console.error("[notifications] booking in-app failed", e);
  }

  if (customer?.id) {
    try {
      const { createPrivilegedClient } = await import(
        "@/lib/supabase/privileged"
      );
      const supabase = await createPrivilegedClient();
      const account = await writeBoutiqueAccountReply(supabase, {
        customerId: customer.id,
        body: params.body,
        createInApp: false,
      });
      result.account = account.ok;
      if (!account.ok) {
        console.warn("[notifications] booking account reply", account.error);
      }
    } catch (e) {
      console.error("[notifications] booking account reply failed", e);
    }
  }

  // Warm email runtime. WhatsApp must NOT depend on the email master switch —
  // guests often only have phone, and email may be local/disabled while Twilio works.
  await getEmailRuntime();
  const settings = await getNotificationSettings();
  const notificationType = `customer_booking_${params.action}`;
  const { shouldUseLocalNotificationOutbox } = await import(
    "@/lib/notifications/local-outbox"
  );
  const localOk = shouldUseLocalNotificationOutbox();

  // WhatsApp — Twilio when configured; otherwise local outbox in dev
  if (prefs.whatsapp && params.booking.phone?.trim()) {
    result.whatsapp.attempted = true;
    const waBody = adminBookingStatusWhatsApp({
      customerName: params.booking.name || "عزيزتي",
      body: params.body,
      settings,
    });
    const wa = await sendWhatsApp({
      to: params.booking.phone,
      body: waBody,
    });
    if (wa.ok) {
      result.whatsapp.sent = true;
      result.whatsapp.local = Boolean(wa.local);
      if (wa.local) result.whatsapp.skippedReason = "local_outbox";
      await logNotification({
        orderId: params.booking.id,
        customerId: key,
        notificationType,
        channel: "whatsapp",
        orderStatus: String(status),
        recipient: params.booking.phone,
        status: "sent",
        deliveryResult: wa.local ? "local_outbox" : wa.sid,
        attempts: 1,
        payload: { body: waBody.slice(0, 2000), local: Boolean(wa.local) },
      });
    } else {
      result.whatsapp.error = wa.error;
      if (/غير مُعد|Twilio/i.test(wa.error || "")) {
        result.whatsapp.skippedReason = "whatsapp_not_configured";
      }
      await logNotification({
        orderId: params.booking.id,
        customerId: key,
        notificationType,
        channel: "whatsapp",
        orderStatus: String(status),
        recipient: params.booking.phone,
        status: "failed",
        errorMessage: wa.error,
        attempts: 1,
      });
    }
  } else if (!prefs.whatsapp) {
    result.whatsapp.skippedReason = "customer_opted_out";
  } else {
    result.whatsapp.skippedReason = "missing_phone";
  }

  const wantEmail = params.wantEmail !== false;
  const to = params.booking.email?.trim() || "";
  if (!wantEmail) {
    result.email.skippedReason = "not_requested";
  } else if (!prefs.email) {
    result.email.skippedReason = "customer_opted_out";
  } else if (!to || !to.includes("@")) {
    result.email.skippedReason = "missing_customer_email";
  } else if (!canAttemptEmail() && !localOk) {
    result.email.skippedReason = "email_unavailable";
  } else {
    result.email.attempted = true;
    const mail = adminBookingStatusEmail({
      customerName: params.booking.name || "عزيزتي",
      subject: params.subject,
      body: params.body,
      settings,
    });
    const sendResult = await sendEmail({
      to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      replyTo: settings.reply_email,
      fromName: settings.sender_name,
    });
    if (sendResult.ok) {
      result.email.sent = true;
      result.email.local = Boolean(sendResult.local);
      result.email.emailId = sendResult.id ?? null;
      if (sendResult.local) result.email.skippedReason = "local_outbox";
      await logNotification({
        orderId: params.booking.id,
        customerId: key,
        notificationType,
        channel: "email",
        orderStatus: String(status),
        recipient: to,
        status: "sent",
        deliveryResult: sendResult.local ? "local_outbox" : sendResult.id,
        attempts: 1,
        payload: {
          subject: mail.subject,
          body: params.body.slice(0, 2000),
          local: Boolean(sendResult.local),
        },
      });
    } else {
      result.email.error = sendResult.error;
      await logNotification({
        orderId: params.booking.id,
        customerId: key,
        notificationType,
        channel: "email",
        orderStatus: String(status),
        recipient: to,
        status: "failed",
        errorMessage: sendResult.error,
        attempts: 1,
      });
    }
  }

  // Local outbox counts as notified for local/dev testing of appointment status
  result.customerNotified =
    result.inApp ||
    result.account ||
    result.whatsapp.sent ||
    result.email.sent;

  return result;
}

/** Fired when a contact message is stored. */
export async function onContactSubmitted(message: {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
}) {
  try {
    await notifyAdminIntake({
      id: message.id,
      notificationType: "admin_new_contact",
      title: "رسالة تواصل جديدة",
      headline: "رسالة جديدة من نموذج التواصل",
      customerId: message.email || message.phone,
      adminPath: "/admin/messages",
      lines: [
        { label: "الاسم", value: message.name },
        { label: "البريد", value: message.email },
        { label: "الهاتف", value: message.phone || "—" },
        { label: "الموضوع", value: message.subject },
        { label: "الرسالة", value: message.message.slice(0, 500) },
      ],
    });
  } catch (e) {
    console.error("[notifications] onContactSubmitted failed", e);
  }
}

/** Fired when someone joins the waiting list. */
export async function onWaitlistJoined(entry: {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  preferred_date?: string | null;
  preferred_time?: string | null;
}) {
  try {
    await notifyAdminIntake({
      id: entry.id,
      notificationType: "admin_new_waitlist",
      title: "انضمام لقائمة الانتظار",
      headline: "عميلة جديدة في قائمة الانتظار",
      customerId: entry.phone || entry.email,
      adminPath: "/admin/bookings",
      lines: [
        { label: "الاسم", value: entry.name },
        { label: "الهاتف", value: entry.phone },
        { label: "البريد", value: entry.email || "—" },
        { label: "التاريخ المفضّل", value: entry.preferred_date || "—" },
        { label: "الوقت المفضّل", value: entry.preferred_time || "—" },
      ],
    });
  } catch (e) {
    console.error("[notifications] onWaitlistJoined failed", e);
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
