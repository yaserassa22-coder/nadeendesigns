/**
 * Patch remaining admin manager components
 */
import fs from "fs";
const root = "C:/Users/malma/Desktop/nadeendesigns";
const patch = (rel, fn) => {
  const p = `${root}/${rel}`;
  let s = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
  const n = fn(s);
  fs.writeFileSync(p, n);
  console.log("patched", rel);
};

function ensureLocale(s, hookLine = "  const { t } = useLocale();\n") {
  if (!s.includes("useLocale")) {
    s = s.replace(
      '"use client";\n',
      '"use client";\n\nimport { useLocale } from "@/components/i18n/LocaleProvider";\n'
    );
  }
  return s;
}

// ---- BookingsManager ----
patch("src/components/admin/BookingsManager.tsx", (s) => {
  s = s.replace(
    /BOOKING_ACTION_LABELS_AR,?\n?/,
    ""
  );
  // Helper using bu
  if (!s.includes("function bookingActionLabel")) {
    s = s.replace(
      "function BookingsManagerInner(",
      `function bookingActionLabel(
  bu: ReturnType<typeof useLocale>["t"]["admin"]["bookingsUi"],
  action: BookingAdminAction
) {
  switch (action) {
    case "confirm":
      return bu.actionConfirm;
    case "reschedule":
      return bu.actionReschedule;
    case "cancel":
      return bu.actionCancel;
    case "complete":
      return bu.actionComplete;
    case "reply":
      return bu.actionReply;
  }
}

function BookingsManagerInner(`
    );
  }
  // Need BookingAdminAction import - check
  if (!s.includes("BookingAdminAction")) {
    s = s.replace(
      'from "@/lib/bookings/status-actions";',
      'from "@/lib/bookings/status-actions";\nimport type { BookingAdminAction } from "@/lib/bookings/status-actions";'
    );
  }

  const reps = [
    [
      "data.error || data.message || `فشل جلب الحجوزات (${res.status})`",
      "data.error || data.message || bu.loadFailedStatus.replace('{status}', String(res.status))",
    ],
    [
      '? "لا يوجد بريد للعميلة — يمكن تحديث الحالة دون إرسال رسالة."',
      "? bu.noEmailHint",
    ],
    ['setReplyError(data.error || "تعذّر تنفيذ الإجراء")', "setReplyError(data.error || bu.actionFailed)"],
    ['? " — وصل إشعار للعميلة"', "? bu.notifiedHint"],
    ['data.message || "تم التحديث"', "data.message || bu.updated"],
    ['data.message || "تم بنجاح"', "data.message || bu.success"],
    ['setSnack(data.message || "تم تحديث الحجز")', "setSnack(data.message || bu.bookingUpdated)"],
    ['setReplyError("تعذّر الاتصال بالخادم. تحققي من الشبكة.")', "setReplyError(bu.networkError)"],
    ["{BOOKING_ACTION_LABELS_AR[action]}", "{bookingActionLabel(bu, action)}"],
    [
      "{BOOKING_ACTION_LABELS_AR[\n                                                action\n                                              ]}",
      "{bookingActionLabel(bu, action)}",
    ],
    ["{BOOKING_ACTION_LABELS_AR[replyTarget.action]}", "{bookingActionLabel(bu, replyTarget.action)}"],
    ['title="تفاصيل التخصيص / الطلب"', "title={bu.personalizationTitle}"],
    ['title="تفاصيل التغليف والإهداء"', "title={bu.giftTitle}"],
    [">المدينة</", ">{bu.city}</"],
    [">المنطقة</", ">{bu.region}</"],
    [">عنوان التوصيل</", ">{bu.deliveryAddress}</"],
    [">حالة التوصيل</", ">{bu.deliveryStatus}</"],
    [">ملاحظات</p>", ">{bu.notes}</p>"],
    [">سجل الحالات</", ">{bu.statusLog}</"],
    ['["arrived", "وصلت العميلة"]', '["arrived", bu.lifecycleArrived]'],
    ['["started", "بدأ الموعد"]', '["started", bu.lifecycleStarted]'],
    ['["completed", "انتهى الموعد"]', '["completed", bu.lifecycleCompleted]'],
    ['["no_show", "لم تحضر"]', '["no_show", bu.lifecycleNoShow]'],
    ['aria-label="إغلاق"', "aria-label={bu.close}"],
    [">إلى</p>", ">{bu.to}</p>"],
    [': " — بدون بريد"}', ": bu.noEmail}"],
    ['label="الموضوع"', "label={bu.subject}"],
    ['label="الرسالة"', "label={bu.message}"],
    [">إلغاء</", ">{bu.cancel}</"],
    [">إرسال وتحديث</", ">{bu.sendAndUpdate}</"],
  ];
  for (const [a, b] of reps) {
    if (!s.includes(a)) console.warn("book miss", JSON.stringify(a).slice(0, 50));
    else s = s.split(a).join(b);
  }
  // broader replacements for city etc that might have different whitespace
  s = s.replace(/\n\s+المدينة\n/, "\n                                        {bu.city}\n");
  s = s.replace(/\n\s+المنطقة\n/, "\n                                          {bu.region}\n");
  s = s.replace(/\n\s+عنوان التوصيل\n/, "\n                                          {bu.deliveryAddress}\n");
  s = s.replace(/\n\s+حالة التوصيل\n/, "\n                                            {bu.deliveryStatus}\n");
  s = s.replace(/\n\s+سجل الحالات\n/, "\n                                    {bu.statusLog}\n");
  s = s.replace(/\n\s+إلغاء\n/, "\n                {bu.cancel}\n");
  s = s.replace(/\n\s+إرسال وتحديث\n/, "\n                {bu.sendAndUpdate}\n");
  return s;
});

// ---- MessagesManager ----
patch("src/components/admin/MessagesManager.tsx", (s) => {
  const reps = [
    [
      '`✓ ${data.message || "تم حفظ الرد"}. ${data.warning || "تعذّر الإرسال عبر البريد."}`',
      '`✓ ${data.message || mui.replySaved}. ${data.warning || mui.replySavedEmailWarn}`',
    ],
    ['setSnack("تم حفظ الرد — تحذير: فشل إرسال البريد")', "setSnack(mui.emailSendFailed)"],
    [
      '`✓ ${data.message || "تم حفظ الرد محلياً}`',
      "`✓ ${data.message || mui.replySavedLocal}",
    ],
    ['setSnack("تم حفظ الرد (وضع محلي)")', "setSnack(mui.replySavedLocalSnack)"],
    ['setReplySuccess("✓ تم إرسال الرد بنجاح.")', "setReplySuccess(mui.replySentOk)"],
    ['setSnack("تم إرسال الرد عبر البريد")', "setSnack(mui.replySentSnack)"],
    ['onClick={() => void onCopy("الهاتف", m.phone!)}', "onClick={() => void onCopy(mui.phone, m.phone!)}"],
    [">رد على الرسالة</", ">{mui.replyModalTitle}</"],
    [">إلى</p>", ">{mui.to}</p>"],
    ['label="الموضوع"', "label={mui.subject}"],
    ['label="الرسالة"', "label={mui.message}"],
    ['placeholder="اكتبي ردّاً مهنياً للعميلة…"', "placeholder={mui.replyPlaceholder}"],
    [">إلغاء</", ">{mui.cancel}</"],
    [">إرسال</", ">{mui.send}</"],
  ];
  for (const [a, b] of reps) {
    if (!s.includes(a)) console.warn("msg miss", JSON.stringify(a).slice(0, 55));
    else s = s.split(a).join(b);
  }
  s = s.replace(/\n\s+رد على الرسالة\n/, "\n                {mui.replyModalTitle}\n");
  s = s.replace(/\n\s+إلغاء\n/, "\n                {mui.cancel}\n");
  s = s.replace(/\n\s+إرسال\n/, "\n                {mui.send}\n");
  s = s.replace(/\n\s+إلى\n/, "\n                {mui.to}\n");
  return s;
});

// ---- EmailProviderPanel ----
patch("src/components/admin/EmailProviderPanel.tsx", (s) => {
  s = s.replace(
    '`${data.local ? "○ محلي: " : "✓ "}${data.message || "تم}`',
    "`${data.local ? ep.localPrefix : \"✓ \"}${data.message || ep.done}`"
  );
  // try alternate
  s = s.replace(
    /\$\{data\.local \? "○ محلي: " : "✓ "\}\$\{data\.message \|\| "تم"\}/,
    "${data.local ? ep.localPrefix : \"✓ \"}${data.message || ep.done}"
  );
  s = s.replace(
    `يُستخدم حالياً مفتاح من ملف البيئة — يمكنك لصق مفتاح جديد هنا
                ليُحفظ في الإدارة بدل ذلك.`,
    `{ep.envKeyHint}`
  );
  return s;
});

console.log("managers batch A done");
