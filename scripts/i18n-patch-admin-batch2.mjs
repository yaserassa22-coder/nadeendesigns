import fs from "fs";

const root = "C:/Users/malma/Desktop/nadeendesigns";

// CustomersOverlayManager
{
  const p = `${root}/src/components/admin/CustomersOverlayManager.tsx`;
  let s = fs.readFileSync(p, "utf8");
  if (!s.includes("useLocale")) {
    s = s.replace(
      '"use client";\n',
      '"use client";\n\nimport { useLocale } from "@/components/i18n/LocaleProvider";\n'
    );
  }
  if (!s.includes("customersUi")) {
    s = s.replace(
      "export function CustomersOverlayManager() {\n  const { caps } = useAdminCapabilities();",
      "export function CustomersOverlayManager() {\n  const { t } = useLocale();\n  const c = t.admin.customersUi;\n  const { caps } = useAdminCapabilities();"
    );
  }
  const reps = [
    ['throw new Error(data.error || "فشل جلب العملاء")', "throw new Error(data.error || c.loadFailed)"],
    ['setError(e instanceof Error ? e.message : "فشل جلب العملاء")', "setError(e instanceof Error ? e.message : c.loadFailed)"],
    ['setSnack("تم نقل العميل إلى سلة المحذوفات")', "setSnack(c.movedToTrash)"],
    [">👥 العملاء</h1>", ">{c.title}</h1>"],
    [
      "طبقة إدارة فوق مفاتيح العملاء (هاتف/بريد) — ليست CRM كاملة.",
      "{c.subtitle}",
    ],
    [">تصدير CSV</", ">{c.exportCsv}</"],
    [">تحديث</", ">{c.refresh}</"],
    ['label="بحث"', "label={c.search}"],
    ['placeholder="الاسم، الهاتف، البريد..."', "placeholder={c.searchPlaceholder}"],
    [">العرض</p>", ">{c.visibility}</p>"],
    [">الاسم</th>", ">{c.colName}</th>"],
    [">الهاتف</th>", ">{c.colPhone}</th>"],
    [">البريد</th>", ">{c.colEmail}</th>"],
    [">إجراءات</th>", ">{c.colActions}</th>"],
    ["جاري التحميل...", "{c.loading}"],
    [
      `لا يوجد عملاء في الطبقة الإدارية بعد. تُنشأ السجلات عند
                    الأرشفة/الحذف.`,
      `{c.emptyHint}`,
    ],
    ["ملف العميل", "{c.profile}"],
    ['title="نقل إلى سلة المحذوفات"', "title={c.moveToTrash}"],
    [">حذف</", ">{c.delete}</"],
    ['title="نقل العميل إلى سلة المحذوفات؟"', "title={c.deleteTitle}"],
    ["confirmLabel=\"نقل إلى السلة\"", 'confirmLabel={c.moveToTrash}'],
  ];
  for (const [a, b] of reps) {
    if (!s.includes(a)) console.warn("cust MISS", a.slice(0, 50));
    else s = s.split(a).join(b);
  }
  // delete confirm body - replace ternary content carefully
  s = s.replace(
    /title=\{c\.deleteTitle\}\s*\n\s*description=\{[\s\S]*?\n\s*\}\n\s*confirmLabel=/,
    `title={c.deleteTitle}
        description={c.deleteConfirm}
        confirmLabel=`
  );
  fs.writeFileSync(p, s);
  console.log("customers patched");
}

// NotificationsSettingsForm
{
  const p = `${root}/src/components/admin/NotificationsSettingsForm.tsx`;
  let s = fs.readFileSync(p, "utf8");
  if (!s.includes("useLocale")) {
    s = s.replace(
      '"use client";\n',
      '"use client";\n\nimport { useLocale } from "@/components/i18n/LocaleProvider";\n'
    );
  }
  if (!s.includes("notificationsAdmin")) {
    s = s.replace(
      "}: NotificationsSettingsFormProps) {\n  const [settings",
      "}: NotificationsSettingsFormProps) {\n  const { t } = useLocale();\n  const n = t.admin.notificationsAdmin;\n  const [settings"
    );
  }
  const reps = [
    ['throw new Error(data.error ?? "فشل الحفظ")', "throw new Error(data.error ?? n.saveFailed)"],
    ['setMessage(data.warning || "تم حفظ إعدادات الإشعارات")', "setMessage(data.warning || n.saved)"],
    ['setMessage(e instanceof Error ? e.message : "حدث خطأ")', "setMessage(e instanceof Error ? e.message : n.genericError)"],
    [">بيانات المرسل</h2>", ">{n.senderTitle}</h2>"],
    ["تظهر في رسائل الإيميل والواتساب", "{n.senderHint}"],
    ['label="اسم المرسل"', "label={n.senderName}"],
    ['label="بريد الرد"', "label={n.replyEmail}"],
    ['label="هاتف العمل / واتساب"', "label={n.businessPhone}"],
    [">طلب الدفعة</h2>", ">{n.paymentTitle}</h2>"],
    ['label="تعليمات الدفع"', "label={n.paymentInstructions}"],
    ['label="رابط الدفع (اختياري — للمستقبل)"', "label={n.paymentLink}"],
    ["قوالب واتساب حسب الحالة", "{n.whatsappTemplates}"],
    ["السطر الرئيسي للرسالة — اتركي فارغاً لاستخدام الافتراضي", "{n.whatsappTemplatesHint}"],
    ["عناوين إيميل حسب الحالة", "{n.emailSubjects}"],
    ["اختياري — اتركي فارغاً لاستخدام العنوان التلقائي", "{n.emailSubjectsHint}"],
    ["حفظ إعدادات الإشعارات", "{n.save}"],
  ];
  for (const [a, b] of reps) {
    if (!s.includes(a)) console.warn("notif MISS", a.slice(0, 50));
    else s = s.split(a).join(b);
  }
  fs.writeFileSync(p, s);
  console.log("notifications patched");
}

// ReportsCenter - title/filters
{
  const p = `${root}/src/components/admin/reports/ReportsCenter.tsx`;
  let s = fs.readFileSync(p, "utf8");
  if (!s.includes("useLocale")) {
    s = s.replace(
      '"use client";\n',
      '"use client";\n\nimport { useLocale } from "@/components/i18n/LocaleProvider";\n'
    );
  }
  if (!s.includes("reportsUi")) {
    // Find main export function
    s = s.replace(
      /export function ReportsCenter[^{]*\{/,
      (m) => m + "\n  const { t } = useLocale();\n  const r = t.admin.reportsUi;"
    );
  }
  const reps = [
    ['return <p className="py-6 text-center text-sm text-muted">لا توجد بيانات</p>;', 'return <p className="py-6 text-center text-sm text-muted">{r.noData}</p>;'],
    ['setError(json.error || "تعذر تحميل التقارير")', "setError(json.error || r.loadFailed)"],
    ['setError(e instanceof Error ? e.message : "تعذر تحميل التقارير")', "setError(e instanceof Error ? e.message : r.loadFailed)"],
    ["مركز التقارير", "{r.title}"],
    ["تحليلات للقراءة فقط · الفترة:{\" \"}", "{r.subtitle}{\" \"}"],
    [">طباعة</", ">{r.print}</"],
    ['title="الفلاتر"', 'title={r.filters}'],
    [">الفترة</span>", ">{r.period}</span>"],
    ['label="من"', "label={r.from}"],
    ['label="إلى"', "label={r.to}"],
    [">التصنيف</span>", ">{r.category}</span>"],
    [">المنتج</span>", ">{r.product}</span>"],
    [">منطقة الشحن</span>", ">{r.shippingRegion}</span>"],
    [">طريقة الاستلام</span>", ">{r.deliveryMethod}</span>"],
    [">حالة الطلب</span>", ">{r.orderStatus}</span>"],
    [">حالة الحجز</span>", ">{r.bookingStatus}</span>"],
    ['<option value="">الكل</option>', '<option value="">{r.all}</option>'],
    ['<option value="delivery">توصيل</option>', '<option value="delivery">{r.delivery}</option>'],
    ['<option value="pickup">استلام من البوتيك</option>', '<option value="pickup">{r.pickup}</option>'],
    ['label="عميل (اسم / جوال / بريد)"', "label={r.customer}"],
    ['{pending ? "جاري التحديث..." : "تطبيق"}', "{pending ? r.updating : r.apply}"],
  ];
  for (const [a, b] of reps) {
    if (!s.includes(a)) console.warn("rep MISS", a.slice(0, 50));
    else s = s.split(a).join(b);
  }
  fs.writeFileSync(p, s);
  console.log("reports patched");
}

// EmailProviderPanel - key chrome
{
  const p = `${root}/src/components/admin/EmailProviderPanel.tsx`;
  let s = fs.readFileSync(p, "utf8");
  if (!s.includes("useLocale")) {
    s = s.replace(
      '"use client";\n',
      '"use client";\n\nimport { useLocale } from "@/components/i18n/LocaleProvider";\n'
    );
  }
  if (!s.includes("emailProvider")) {
    s = s.replace(
      /export function EmailProviderPanel[^{]*\{/,
      (m) => m + "\n  const { t } = useLocale();\n  const ep = t.admin.emailProvider;"
    );
  }
  const reps = [
    ['throw new Error(data.error || "تعذّر تحميل إعدادات البريد")', "throw new Error(data.error || ep.loadFailed)"],
    ['setMessage(e instanceof Error ? e.message : "حدث خطأ")', "setMessage(e instanceof Error ? e.message : ep.genericError)"],
    ['throw new Error(data.error || "فشل الحفظ")', "throw new Error(data.error || ep.saveFailed)"],
    ['setMessage(data.message || "تم حفظ إعدادات البريد")', "setMessage(data.message || ep.saved)"],
    ["if (!confirm(\"إزالة مفتاح Resend المحفوظ في الإدارة؟ (يبقى مفتاح البيئة إن وُجد)\"))", "if (!confirm(ep.clearConfirm))"],
    ['throw new Error(data.error || "فشل المسح")', "throw new Error(data.error || ep.clearFailed)"],
    ['setMessage("تم مسح مفتاح Resend من إعدادات الإدارة")', "setMessage(ep.cleared)"],
    ['throw new Error(data.error || "فشل إرسال بريد الاختبار")', "throw new Error(data.error || ep.testFailed)"],
    ['setTestMessage(e instanceof Error ? e.message : "حدث خطأ")', "setTestMessage(e instanceof Error ? e.message : ep.genericError)"],
    [">جاري تحميل إعدادات البريد…</p>", ">{ep.loading}</p>"],
    [">حالة البريد</p>", ">{ep.statusTitle}</p>"],
    ["اتصال Resend (بدون تعديل كود)", "{ep.connectionTitle}"],
    [
      `محلياً: اختاري «محلي». بعد شراء Resend وتوثيق النطاق: الصقي المفتاح،
          ضعي FROM من نطاقك، واختاري «Resend».`,
      `{ep.connectionHint}`,
    ],
    [">تفعيل إرسال البريد</span>", ">{ep.enableSending}</span>"],
    ["يتوافق أيضاً مع إعدادات المتجر → قنوات الإشعارات", "{ep.enableSendingHint}"],
    [">وضع التسليم</legend>", ">{ep.deliveryMode}</legend>"],
    [">محلي (الآن)</span>", ">{ep.localMode}</span>"],
    [
      `الرسائل والردود تُحفظ وتعمل في الموقع دون إرسال خارجي — مثالي قبل
                النطاق وResend`,
      `{ep.localModeHint}`,
    ],
    [">Resend (إنتاج)</span>", ">{ep.resendMode}</span>"],
    ["إرسال حقيقي عبر Resend — يحتاج مفتاح API و FROM من نطاق موثّق", "{ep.resendModeHint}"],
    ['label="مفتاح Resend API"', "label={ep.apiKey}"],
    ['? "اتركي فارغاً للإبقاء على المفتاح الحالي"', "? ep.apiKeyKeep"],
    ["مسح المفتاح المحفوظ", "{ep.clearKey}"],
    ['label="عنوان المرسل (FROM)"', "label={ep.fromAddress}"],
    ['label="اسم المرسل"', "label={ep.senderName}"],
    ['label="بريد الرد (Reply-To)"', "label={ep.replyTo}"],
    ['label="بريد إشعارات الإدارة"', "label={ep.adminNotifyEmail}"],
    ["حفظ اتصال البريد", "{ep.saveConnection}"],
    [">اختبار الإرسال</h2>", ">{ep.testTitle}</h2>"],
    [
      `في الوضع المحلي يُسجَّل الاختبار دون إرسال خارجي. في وضع Resend تُرسل
          رسالة حقيقية (مع sandbox فقط لبريد حساب Resend).`,
      `{ep.testHint}`,
    ],
    ['label="إلى"', "label={ep.testTo}"],
    ["إرسال اختبار", "{ep.sendTest}"],
  ];
  for (const [a, b] of reps) {
    if (!s.includes(a)) console.warn("email MISS", a.slice(0, 55));
    else s = s.split(a).join(b);
  }
  fs.writeFileSync(p, s);
  console.log("email patched");
}

console.log("batch 2 done");
