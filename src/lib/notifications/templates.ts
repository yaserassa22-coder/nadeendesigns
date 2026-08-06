import {
  OFFICIAL_INSTAGRAM_HANDLE,
  OFFICIAL_INSTAGRAM_URL,
  SITE_NAME,
} from "@/lib/constants";
import { formatDateWestern, formatPrice } from "@/lib/utils";
import { getSiteUrl } from "@/lib/notifications/config";
import {
  DEFAULT_WHATSAPP_BY_STATUS,
  getOrderStatusLabel,
  SHOP_ORDER_STATUS_LABELS,
  type NotificationSettings,
  type ShopOrder,
  type ShopOrderStatus,
} from "@/types/shop";

export function orderNumber(orderId: string) {
  return `ND-${orderId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export function statusLabel(
  status: ShopOrderStatus | string,
  order?: ShopOrder
) {
  if (order) {
    return getOrderStatusLabel(status as ShopOrderStatus, order.delivery_method);
  }
  return (
    SHOP_ORDER_STATUS_LABELS[status as ShopOrderStatus] ?? String(status)
  );
}

function itemsSummaryHtml(order: ShopOrder) {
  const rows = (order.items ?? [])
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #efe8dc;text-align:right;">
          ${escapeHtml(item.name_ar)}
          <div style="color:#8a7f72;font-size:12px;margin-top:4px;">
            الكمية: ${item.quantity} × ${formatPrice(Number(item.unit_price))}
          </div>
        </td>
      </tr>`
    )
    .join("");
  return rows || `<tr><td style="padding:10px 0;text-align:right;">—</td></tr>`;
}

function itemsSummaryText(order: ShopOrder) {
  return (order.items ?? [])
    .map(
      (item) =>
        `• ${item.name_ar} × ${item.quantity} — ${formatPrice(Number(item.unit_price))}`
    )
    .join("\n");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shippingAddressHtml(order: ShopOrder) {
  if (!order.shipping_required && !order.delivery_method) return "";
  if (order.delivery_method === "pickup") {
    return `
    <p style="margin:16px 0 0;text-align:right;color:#5c5348;line-height:1.8;">
      <strong>طريقة الاستلام:</strong> استلام من البوتيك<br/>
      سيتم إشعارك عند جاهزية طلبك للاستلام من البوتيك.
    </p>`;
  }
  const lines = [
    order.shipping_full_name,
    order.shipping_phone,
    order.shipping_region_name_ar ||
      order.shipping_region_custom ||
      order.shipping_region,
    order.shipping_city,
    order.shipping_neighborhood,
    order.shipping_building_number,
    order.shipping_address,
    order.shipping_postal_code,
    order.shipping_notes,
    order.tracking_number ? `رقم التتبع: ${order.tracking_number}` : null,
  ].filter(Boolean);
  if (lines.length === 0 && !order.shipping_fee_pending) return "";
  const feeLine = order.shipping_fee_pending
    ? `<br/><span style="color:#8a7f72;font-size:13px;">رسوم الشحن: قيد المراجعة — سيتم تحديدها بعد مراجعة المنطقة.</span>`
    : order.shipping_cost != null
      ? `<br/><span style="color:#8a7f72;font-size:13px;">رسوم الشحن: <span dir="ltr">${formatPrice(Number(order.shipping_cost))}</span></span>`
      : "";
  return `
    <p style="margin:16px 0 0;text-align:right;color:#5c5348;line-height:1.8;">
      <strong>عنوان التوصيل:</strong><br/>
      ${lines.map((l) => escapeHtml(String(l))).join("<br/>")}
      ${feeLine}
    </p>`;
}

function shippingAddressText(order: ShopOrder) {
  if (!order.shipping_required && !order.delivery_method) return "";
  if (order.delivery_method === "pickup") {
    return `\nطريقة الاستلام: استلام من البوتيك\nسيتم إشعارك عند جاهزية طلبك للاستلام من البوتيك.`;
  }
  const lines = [
    order.shipping_full_name,
    order.shipping_phone,
    order.shipping_region_name_ar ||
      order.shipping_region_custom ||
      order.shipping_region,
    order.shipping_city,
    order.shipping_neighborhood,
    order.shipping_building_number,
    order.shipping_address,
    order.shipping_postal_code,
    order.shipping_notes,
    order.tracking_number ? `رقم التتبع: ${order.tracking_number}` : null,
  ].filter(Boolean);
  if (lines.length === 0 && !order.shipping_fee_pending) return "";
  const fee = order.shipping_fee_pending
    ? `\nرسوم الشحن: قيد المراجعة`
    : order.shipping_cost != null
      ? `\nرسوم الشحن: ${formatPrice(Number(order.shipping_cost))}`
      : "";
  return `\nعنوان التوصيل:\n${lines.join("\n")}${fee}`;
}

function customerOrderUrl(orderId: string) {
  return `${getSiteUrl()}/orders/${orderId}`;
}

function customerOrderLinkHtml(orderId: string) {
  const url = customerOrderUrl(orderId);
  return `
    <p style="margin:22px 0 0;text-align:center;">
      <a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#b8956c;color:#fff;text-decoration:none;font-weight:700;">
        متابعة الطلب
      </a>
    </p>
    <p style="margin:10px 0 0;text-align:center;font-size:12px;color:#8a7f72;" dir="ltr">${escapeHtml(url)}</p>`;
}

function whatsappLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const intl =
    digits.startsWith("0") && digits.length === 10
      ? `972${digits.slice(1)}`
      : digits;
  return `https://wa.me/${intl}`;
}

function emailShell(
  title: string,
  body: string,
  settings: NotificationSettings
) {
  const phone = settings.business_phone;
  const email = settings.reply_email;
  const logoUrl = `${getSiteUrl()}/logo.svg`;
  const waUrl = whatsappLink(phone);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f3eee6;font-family:Tahoma,Arial,sans-serif;color:#2c2419;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(180deg,#f7f3ec 0%,#efe6d8 100%);padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#fffdf9;border:1px solid #e4d8c4;border-radius:20px;overflow:hidden;box-shadow:0 8px 28px rgba(184,149,108,0.12);">
          <tr>
            <td style="background:linear-gradient(135deg,#faf6ef,#f0e6d6);padding:26px 24px;text-align:center;border-bottom:1px solid #e4d8c4;">
              <img src="${logoUrl}" alt="${escapeHtml(settings.sender_name || SITE_NAME)}" width="220" style="max-width:220px;height:auto;display:block;margin:0 auto 8px;" />
              <div style="font-size:12px;color:#8a7f72;letter-spacing:0.12em;">بوتيك فساتين الزفاف الفاخرة</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:22px 24px;background:#faf6ef;border-top:1px solid #e4d8c4;text-align:center;">
              <a href="${waUrl}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#25D366;color:#fff;text-decoration:none;font-weight:700;margin-bottom:14px;">
                تواصلي عبر واتساب
              </a>
              <div style="color:#8a7f72;font-size:12px;line-height:1.9;">
                <div>الهاتف: <span dir="ltr">${escapeHtml(phone)}</span></div>
                <div>البريد: ${escapeHtml(email)}</div>
                <div>
                  انستغرام:
                  <a href="${OFFICIAL_INSTAGRAM_URL}" style="color:#b8956c;text-decoration:none;">
                    ${OFFICIAL_INSTAGRAM_HANDLE}
                  </a>
                </div>
                <div style="margin-top:8px;">© ${new Date().getFullYear()} ${escapeHtml(settings.sender_name || SITE_NAME)}</div>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function statusHeadline(status: ShopOrderStatus, order?: ShopOrder): string {
  if (status === "ready_for_pickup") {
    return "طلبك جاهز للاستلام من البوتيك";
  }
  if (status === "shipped") {
    return "تم تجهيز طلبك وسيتم شحنه";
  }
  if (status === "delivered" && order?.delivery_method === "pickup") {
    return "تم استلام طلبك من البوتيك";
  }
  const map: Partial<Record<ShopOrderStatus, string>> = {
    pending: "تم استلام طلبكِ بنجاح",
    confirmed: "تم تأكيد طلبكِ",
    payment_received: "تم استلام الدفعة",
    in_production: "طلبكِ قيد التجهيز",
    ready_for_pickup: "طلبك جاهز للاستلام من البوتيك",
    shipped: "تم تجهيز طلبك وسيتم شحنه",
    delivered: "تم تسليم طلبكِ",
    cancelled: "تم إلغاء الطلب",
  };
  return map[status] || "تحديث على طلبكِ";
}

export function customerStatusEmail(
  order: ShopOrder,
  status: ShopOrderStatus,
  settings: NotificationSettings
) {
  const number = orderNumber(order.id);
  const label = statusLabel(status, order);
  const headline = statusHeadline(status, order);
  const subject =
    settings.email_subjects[status] ||
    `${settings.sender_name || SITE_NAME} — ${headline} (${number})`;

  const html = emailShell(
    subject,
    `
    <h1 style="margin:0 0 10px;font-size:22px;color:#2c2419;">مرحباً ${escapeHtml(order.name)}</h1>
    <p style="margin:0 0 20px;line-height:1.85;color:#5c5348;">
      ${escapeHtml(headline)} لدى ${escapeHtml(settings.sender_name || SITE_NAME)}.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf6ef;border:1px solid #e4d8c4;border-radius:14px;margin-bottom:20px;">
      <tr>
        <td style="padding:16px 18px;text-align:right;">
          <div style="font-size:12px;color:#8a7f72;">اسم العميلة</div>
          <div style="font-size:16px;margin-top:4px;">${escapeHtml(order.name)}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:0 18px 14px;text-align:right;">
          <div style="font-size:12px;color:#8a7f72;">رقم الطلب</div>
          <div style="font-size:18px;color:#b8956c;font-weight:700;margin-top:4px;" dir="ltr">${number}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:0 18px 16px;text-align:right;">
          <div style="font-size:12px;color:#8a7f72;">حالة الطلب</div>
          <div style="display:inline-block;margin-top:8px;padding:8px 14px;border-radius:999px;background:#b8956c;color:#fff;font-size:14px;">
            ${escapeHtml(label)}
          </div>
        </td>
      </tr>
    </table>
    <h2 style="margin:0 0 10px;font-size:16px;color:#2c2419;">ملخص الطلب</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${itemsSummaryHtml(order)}
    </table>
    ${shippingAddressHtml(order)}
    <p style="margin:18px 0 0;text-align:right;font-size:15px;color:#2c2419;">
      <strong>المجموع:</strong> <span dir="ltr">${formatPrice(Number(order.total))}</span>
    </p>
    ${customerOrderLinkHtml(order.id)}
    `,
    settings
  );
  return { subject, html };
}

export function paymentRequestEmail(
  order: ShopOrder,
  amount: number,
  settings: NotificationSettings
) {
  const number = orderNumber(order.id);
  const subject = `${settings.sender_name || SITE_NAME} — طلب دفعة للطلب ${number}`;
  const linkBlock = settings.payment_link
    ? `<p style="margin:18px 0 0;text-align:center;">
        <a href="${escapeHtml(settings.payment_link)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#b8956c;color:#fff;text-decoration:none;font-weight:700;">
          رابط الدفع
        </a>
      </p>`
    : `<p style="margin:14px 0 0;color:#8a7f72;font-size:13px;text-align:right;">رابط الدفع سيكون متاحاً قريباً.</p>`;

  const html = emailShell(
    subject,
    `
    <h1 style="margin:0 0 10px;font-size:22px;color:#2c2419;">مرحباً ${escapeHtml(order.name)}</h1>
    <p style="margin:0 0 18px;line-height:1.85;color:#5c5348;">
      نرجو إتمام الدفعة لإكمال طلبكِ رقم <strong dir="ltr">${number}</strong>.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf6ef;border:1px solid #e4d8c4;border-radius:14px;margin-bottom:18px;">
      <tr>
        <td style="padding:16px 18px;text-align:right;">
          <div style="font-size:12px;color:#8a7f72;">المبلغ المطلوب</div>
          <div style="font-size:22px;color:#b8956c;font-weight:700;margin-top:6px;" dir="ltr">${formatPrice(amount)}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:0 18px 16px;text-align:right;color:#5c5348;line-height:1.85;">
          <div style="font-size:12px;color:#8a7f72;margin-bottom:6px;">تعليمات الدفع</div>
          ${escapeHtml(settings.payment_instructions).replace(/\n/g, "<br/>")}
        </td>
      </tr>
    </table>
    <h2 style="margin:0 0 10px;font-size:16px;color:#2c2419;">ملخص الطلب</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${itemsSummaryHtml(order)}
    </table>
    ${linkBlock}
    ${customerOrderLinkHtml(order.id)}
    `,
    settings
  );
  return { subject, html };
}

export function customMessageEmail(
  order: ShopOrder,
  message: string,
  settings: NotificationSettings
) {
  const number = orderNumber(order.id);
  const subject = `رسالة من ${settings.sender_name || SITE_NAME} — طلب ${number}`;
  const html = emailShell(
    subject,
    `
    <h1 style="margin:0 0 10px;font-size:22px;color:#2c2419;">مرحباً ${escapeHtml(order.name)}</h1>
    <p style="margin:0 0 8px;font-size:12px;color:#8a7f72;">رقم الطلب: <span dir="ltr">${number}</span></p>
    <div style="margin-top:16px;padding:18px;background:#faf6ef;border:1px solid #e4d8c4;border-radius:14px;line-height:1.9;color:#2c2419;text-align:right;">
      ${escapeHtml(message).replace(/\n/g, "<br/>")}
    </div>
    ${customerOrderLinkHtml(order.id)}
    `,
    settings
  );
  return { subject, html };
}

export function adminNewOrderEmail(
  order: ShopOrder,
  settings: NotificationSettings
) {
  const number = orderNumber(order.id);
  const adminUrl = `${getSiteUrl()}/admin/orders?focus=${order.id}`;
  const subject = `طلب جديد ${number} — ${order.name}`;
  const notesBlock = order.notes
    ? `<p style="margin:16px 0 0;text-align:right;color:#5c5348;line-height:1.8;">
      <strong>ملاحظات:</strong><br/>
      ${escapeHtml(order.notes).replace(/\n/g, "<br/>")}
    </p>`
    : "";
  const html = emailShell(
    subject,
    `
    <h1 style="margin:0 0 12px;font-size:22px;color:#2c2419;">طلب جديد من المتجر</h1>
    <p style="margin:0 0 18px;line-height:1.8;color:#5c5348;">
      تم استلام طلب جديد ويحتاج لمتابعتكِ في لوحة التحكم.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf6ef;border:1px solid #e4d8c4;border-radius:14px;margin-bottom:18px;">
      <tr><td style="padding:14px 18px;text-align:right;"><strong>رقم الطلب:</strong> <span dir="ltr">${number}</span></td></tr>
      <tr><td style="padding:0 18px 10px;text-align:right;"><strong>الاسم:</strong> ${escapeHtml(order.name)}</td></tr>
      <tr><td style="padding:0 18px 10px;text-align:right;"><strong>الهاتف:</strong> <span dir="ltr">${escapeHtml(order.phone)}</span></td></tr>
      <tr><td style="padding:0 18px 10px;text-align:right;"><strong>البريد:</strong> ${escapeHtml(order.email || "—")}</td></tr>
      <tr><td style="padding:0 18px 14px;text-align:right;"><strong>المجموع / الميزانية:</strong> <span dir="ltr">${formatPrice(Number(order.total))}</span></td></tr>
    </table>
    <h2 style="margin:0 0 10px;font-size:16px;color:#2c2419;">تفاصيل الطلب</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${itemsSummaryHtml(order)}
    </table>
    ${shippingAddressHtml(order)}
    ${notesBlock}
    <p style="margin:24px 0 0;text-align:center;">
      <a href="${adminUrl}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#b8956c;color:#fff;text-decoration:none;font-weight:700;">
        فتح الطلب في لوحة التحكم
      </a>
    </p>
    `,
    settings
  );
  return { subject, html };
}

export function customerWhatsAppMessage(
  order: ShopOrder,
  status: ShopOrderStatus,
  settings: NotificationSettings
) {
  const number = orderNumber(order.id);
  const label = statusLabel(status, order);
  let headline =
    settings.whatsapp_templates[status] ||
    DEFAULT_WHATSAPP_BY_STATUS[status] ||
    `تحديث طلبكِ: ${label}`;

  if (!settings.whatsapp_templates[status]) {
    if (status === "ready_for_pickup") {
      headline = "طلبك جاهز للاستلام من البوتيك.";
    } else if (status === "shipped") {
      headline = "تم تجهيز طلبك وسيتم شحنه.";
    } else if (status === "delivered" && order.delivery_method === "pickup") {
      headline = "تم استلام طلبك من البوتيك. شكراً لثقتكِ ❤️";
    }
  }

  return [
    `✨ ${settings.sender_name || SITE_NAME}`,
    ``,
    `مرحباً ${order.name}،`,
    headline,
    ``,
    `رقم الطلب: ${number}`,
    `الحالة: ${label}`,
    shippingAddressText(order).trim(),
    ``,
    `ملخص الطلب:`,
    itemsSummaryText(order),
    ``,
    `المجموع: ${formatPrice(Number(order.total))}`,
    ``,
    `متابعة الطلب: ${customerOrderUrl(order.id)}`,
    ``,
    `للاستفسار: ${settings.business_phone}`,
    `انستغرام: ${OFFICIAL_INSTAGRAM_HANDLE}`,
  ]
    .filter((line, idx, arr) => !(line === "" && arr[idx - 1] === ""))
    .join("\n");
}

export function paymentRequestWhatsApp(
  order: ShopOrder,
  amount: number,
  settings: NotificationSettings
) {
  const number = orderNumber(order.id);
  const lines = [
    `💳 ${settings.sender_name || SITE_NAME}`,
    ``,
    `مرحباً ${order.name}،`,
    `بانتظار الدفعة لإكمال طلبكِ`,
    ``,
    `رقم الطلب: ${number}`,
    `المبلغ: ${formatPrice(amount)}`,
    ``,
    `تعليمات الدفع:`,
    settings.payment_instructions,
  ];
  if (settings.payment_link) {
    lines.push(``, `رابط الدفع: ${settings.payment_link}`);
  } else {
    lines.push(``, `رابط الدفع سيكون متاحاً قريباً.`);
  }
  lines.push(``, `متابعة الطلب: ${customerOrderUrl(order.id)}`);
  lines.push(``, `للاستفسار: ${settings.business_phone}`);
  return lines.join("\n");
}

export function customWhatsAppMessage(
  order: ShopOrder,
  message: string,
  settings: NotificationSettings
) {
  const number = orderNumber(order.id);
  return [
    `💌 ${settings.sender_name || SITE_NAME}`,
    ``,
    `مرحباً ${order.name}،`,
    `بخصوص طلبكِ ${number}:`,
    ``,
    message,
    ``,
    `متابعة الطلب: ${customerOrderUrl(order.id)}`,
    ``,
    `للاستفسار: ${settings.business_phone}`,
  ].join("\n");
}

export function adminWhatsAppMessage(
  order: ShopOrder,
  settings: NotificationSettings
) {
  const number = orderNumber(order.id);
  return [
    `🛒 طلب جديد — ${settings.sender_name || SITE_NAME}`,
    `الرقم: ${number}`,
    `العميلة: ${order.name}`,
    `الهاتف: ${order.phone}`,
    `البريد: ${order.email || "—"}`,
    `المجموع: ${formatPrice(Number(order.total))}`,
    ``,
    itemsSummaryText(order),
    shippingAddressText(order),
    ``,
    `لوحة التحكم: ${getSiteUrl()}/admin/orders?focus=${order.id}`,
  ].join("\n");
}

/** Generic Admin intake alert (contact, booking, waitlist, …). */
export function adminIntakeAlertEmail(
  alert: {
    title: string;
    headline: string;
    lines: Array<{ label: string; value: string }>;
    adminPath: string;
  },
  settings: NotificationSettings
) {
  const adminUrl = `${getSiteUrl()}${alert.adminPath}`;
  const subject = `${alert.title} — ${settings.sender_name || SITE_NAME}`;
  const rows = alert.lines
    .map(
      (line) =>
        `<tr><td style="padding:0 18px 10px;text-align:right;"><strong>${escapeHtml(line.label)}:</strong> ${escapeHtml(line.value)}</td></tr>`
    )
    .join("");
  const html = emailShell(
    subject,
    `
    <h1 style="margin:0 0 12px;font-size:22px;color:#2c2419;">${escapeHtml(alert.headline)}</h1>
    <p style="margin:0 0 18px;line-height:1.8;color:#5c5348;">
      طلب جديد يحتاج متابعتكِ في لوحة التحكم.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf6ef;border:1px solid #e4d8c4;border-radius:14px;margin-bottom:18px;">
      ${rows}
    </table>
    <p style="margin:24px 0 0;text-align:center;">
      <a href="${adminUrl}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#b8956c;color:#fff;text-decoration:none;font-weight:700;">
        فتح في لوحة التحكم
      </a>
    </p>
    `,
    settings
  );
  return { subject, html };
}

export function adminIntakeAlertWhatsApp(
  alert: {
    title: string;
    lines: Array<{ label: string; value: string }>;
    adminPath: string;
  },
  settings: NotificationSettings
) {
  return [
    `${alert.title} — ${settings.sender_name || SITE_NAME}`,
    ...alert.lines.map((line) => `${line.label}: ${line.value}`),
    ``,
    `لوحة التحكم: ${getSiteUrl()}${alert.adminPath}`,
  ].join("\n");
}

/** Booking confirmation email */
export function bookingSubmittedEmail(
  booking: {
    id: string;
    name: string;
    date: string;
    time: string;
    service_type: string;
  },
  settings: NotificationSettings
) {
  const subject = `${settings.sender_name || SITE_NAME} — تم استلام طلب حجزكِ`;
  const html = emailShell(
    subject,
    `
    <h1 style="margin:0 0 10px;font-size:22px;color:#2c2419;">مرحباً ${escapeHtml(booking.name)}</h1>
    <p style="margin:0 0 20px;line-height:1.85;color:#5c5348;">
      استلمنا طلب حجزكِ بنجاح وسنتواصل معكِ قريبًا لتأكيد الموعد.
    </p>
    <p style="margin:0;line-height:1.85;color:#5c5348;">
      <strong>التاريخ:</strong> ${escapeHtml(formatDateWestern(booking.date))}<br/>
      <strong>الوقت:</strong> ${escapeHtml(booking.time.slice(0, 5))}<br/>
      <strong>الخدمة:</strong> ${escapeHtml(booking.service_type)}
    </p>
    `,
    settings
  );
  return { subject, html };
}

/** Booking confirmation WhatsApp */
export function bookingSubmittedWhatsApp(
  booking: {
    name: string;
    date: string;
    time: string;
    service_type: string;
  },
  settings: NotificationSettings
) {
  return [
    `✨ ${settings.sender_name || SITE_NAME}`,
    ``,
    `مرحباً ${booking.name}،`,
    `استلمنا طلب حجزكِ بنجاح.`,
    `📅 ${formatDateWestern(booking.date)} — ⏰ ${booking.time.slice(0, 5)}`,
    `الخدمة: ${booking.service_type}`,
    ``,
    `سنتواصل معكِ قريبًا لتأكيد الموعد.`,
  ].join("\n");
}

/** Admin → customer reply to a contact form message (HTML + plain text). */
export function adminContactReplyEmail(params: {
  customerName: string;
  originalSubject: string;
  replySubject: string;
  replyBody: string;
  settings: NotificationSettings;
}) {
  const brand = params.settings.sender_name || SITE_NAME;
  const safeBody = escapeHtml(params.replyBody).replace(/\n/g, "<br/>");
  const subject = params.replySubject.trim() || `Re: ${params.originalSubject}`;
  const html = emailShell(
    subject,
    `
    <h1 style="margin:0 0 12px;font-size:22px;color:#2c2419;">مرحباً ${escapeHtml(params.customerName)}</h1>
    <p style="margin:0 0 18px;line-height:1.85;color:#5c5348;">
      شكراً لتواصلكِ مع ${escapeHtml(brand)}. إليكِ ردّنا بخصوص:
      <strong>${escapeHtml(params.originalSubject)}</strong>
    </p>
    <div style="margin:0;padding:18px;background:#faf6ef;border:1px solid #e4d8c4;border-radius:14px;line-height:1.9;color:#2c2419;text-align:right;">
      ${safeBody}
    </div>
    <p style="margin:22px 0 0;line-height:1.85;color:#5c5348;">
      مع أطيب التحيات،<br/>
      فريق ${escapeHtml(brand)}
    </p>
    `,
    params.settings
  );
  const text = [
    `مرحباً ${params.customerName}،`,
    ``,
    `شكراً لتواصلكِ مع ${brand}.`,
    `بخصوص: ${params.originalSubject}`,
    ``,
    params.replyBody.trim(),
    ``,
    `مع أطيب التحيات،`,
    `فريق ${brand}`,
    params.settings.reply_email
      ? `البريد: ${params.settings.reply_email}`
      : "",
    params.settings.business_phone
      ? `الهاتف: ${params.settings.business_phone}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

/** Admin → customer booking status / reply email (HTML + plain text). */
export function adminBookingStatusEmail(params: {
  customerName: string;
  subject: string;
  body: string;
  settings: NotificationSettings;
}) {
  const brand = params.settings.sender_name || SITE_NAME;
  const safeBody = escapeHtml(params.body).replace(/\n/g, "<br/>");
  const subject = params.subject.trim() || `موعدكِ — ${brand}`;
  const html = emailShell(
    subject,
    `
    <h1 style="margin:0 0 12px;font-size:22px;color:#2c2419;">مرحباً ${escapeHtml(params.customerName)}</h1>
    <div style="margin:0;padding:18px;background:#faf6ef;border:1px solid #e4d8c4;border-radius:14px;line-height:1.9;color:#2c2419;text-align:right;">
      ${safeBody}
    </div>
    <p style="margin:22px 0 0;line-height:1.85;color:#5c5348;">
      مع أطيب التحيات،<br/>
      فريق ${escapeHtml(brand)}
    </p>
    `,
    params.settings
  );
  const text = [
    `مرحباً ${params.customerName}،`,
    ``,
    params.body.trim(),
    ``,
    `مع أطيب التحيات،`,
    `فريق ${brand}`,
  ].join("\n");

  return { subject, html, text };
}


