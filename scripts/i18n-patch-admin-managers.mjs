/**
 * Patch remaining admin chrome files to useLocale dictionaries.
 */
import fs from "fs";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

function patch(rel, fn) {
  const p = `${root}/${rel}`;
  let s = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
  const n = fn(s);
  if (n !== s) {
    fs.writeFileSync(p, n);
    console.log("patched", rel);
  } else console.log("unchanged", rel);
}

function ensureUseLocale(s) {
  if (s.includes("useLocale")) return s;
  if (s.includes('"use client"')) {
    return s.replace(
      '"use client";\n',
      '"use client";\n\nimport { useLocale } from "@/components/i18n/LocaleProvider";\n'
    );
  }
  return `import { useLocale } from "@/components/i18n/LocaleProvider";\n` + s;
}

// --- CustomerAuthSettingsForm ---
patch("src/components/admin/CustomerAuthSettingsForm.tsx", (s) => {
  s = ensureUseLocale(s);
  if (!s.includes("const { t } = useLocale()")) {
    s = s.replace(
      /export function CustomerAuthSettingsForm\([^)]*\) \{/,
      (m) => m + "\n  const { t } = useLocale();\n  const a = t.admin.authSettings;"
    );
  } else if (!s.includes("authSettings")) {
    s = s.replace(
      "const { t } = useLocale();",
      "const { t } = useLocale();\n  const a = t.admin.authSettings;"
    );
  }
  const reps = [
    ['throw new Error(data.error || "فشل الحفظ")', "throw new Error(data.error || a.saveFailed)"],
    ['setMessage("تم حفظ قنوات مصادقة العملاء")', "setMessage(a.saveOk)"],
    ['setMessage(e instanceof Error ? e.message : "فشل")', "setMessage(e instanceof Error ? e.message : a.failed)"],
    [">مصادقة العملاء</h2>", ">{a.title}</h2>"],
    [
      `تحكّمي بظهور وترتيب قنوات الدخول وشارة «قريباً» دون تعديل الكود.
            الأسرار تبقى في البيئة (مثل Resend) — هنا التفعيل والإعداد فقط.`,
      `{a.description}`,
    ],
    ['label="التسمية بالعربية"', "label={a.labelAr}"],
    [">مزوّد واتساب (غير سرّي)</span>", ">{a.whatsappProvider}</span>"],
    [">تلقائي (auto)</option>", ">{a.providerAuto}</option>"],
    [
      `<span className="rounded-lg bg-amber-50 px-2 py-1 text-center text-xs text-amber-800">
                      قريباً
                    </span>`,
      `<span className="rounded-lg bg-amber-50 px-2 py-1 text-center text-xs text-amber-800">
                      {a.comingSoon}
                    </span>`,
    ],
    ["مفعّل / ظاهر", "{a.enabledVisible}"],
    ["قريباً\n                  </label>", "{a.comingSoon}\n                  </label>"],
    ["مُعدّ (env جاهز)", "{a.configuredEnv}"],
    [">أعلى</button>", ">{a.moveUp}</button>"],
    [">أسفل</button>", ">{a.moveDown}</button>"],
    [">انتهاء OTP (ثانية)</span>", ">{a.otpExpiry}</span>"],
    [">أقصى محاولات</span>", ">{a.maxAttempts}</span>"],
    [">إعادة إرسال (ثانية)</span>", ">{a.resendSeconds}</span>"],
    [">حالة البيئة (أسرار):</p>", ">{a.envStatus}</p>"],
    ["واتساب OTP:{\" \"}", "{a.whatsappOtp}{\" \"}"],
    [">مزوّد واتساب env: {String(flags.whatsappProvider || \"auto\")}</li>", ">{a.whatsappProviderEnv} {String(flags.whatsappProvider || \"auto\")}</li>"],
    [
      `Resend / بريد الاستعادة: {flags.emailConfigured ? "✓" : "✗"} — من
            الإشعارات`,
      `{a.resendRecovery} {flags.emailConfigured ? "✓" : "✗"} — {a.fromNotifications}`,
    ],
    [
      `عند شراء واتساب للأعمال: اختاري المزوّد أعلاه، أزيلي «قريباً»، فعّلي
          القناة، وأضيفي المفاتيح في البيئة (نفس نمط Resend — لا حاجة لتعديل
          الكود لإظهار الزر). قوالب الإشعارات من صفحة الإشعارات.`,
      `{a.footerHint}`,
    ],
    [">حفظ قنوات المصادقة</Button>", ">{a.save}</Button>"],
  ];
  for (const [a0, b0] of reps) {
    if (!s.includes(a0)) console.warn("auth MISS", a0.slice(0, 50));
    else s = s.split(a0).join(b0);
  }
  return s;
});

// --- AdminSidebar ---
patch("src/components/admin/AdminSidebar.tsx", (s) => {
  s = ensureUseLocale(s);
  // find a component that has the Arabic and add useLocale if needed
  if (!s.includes("sidebarUi")) {
    // Add hook near existing useLocale if any
    if (s.includes("const { t } = useLocale()") || s.includes("const { t,") ) {
      s = s.replace(
        /const \{ t[^}]*\} = useLocale\(\);/,
        (m) => m + "\n  const sb = t.admin.sidebarUi;"
      );
    } else {
      // Find function containing the Arabic strings
      const idx = s.indexOf("لا توجد تصنيفات ظاهرة");
      if (idx > 0) {
        // walk back to nearest function start
        const fn = s.lastIndexOf("function ", idx);
        const brace = s.indexOf("{", fn);
        s = s.slice(0, brace + 1) + "\n  const { t } = useLocale();\n  const sb = t.admin.sidebarUi;" + s.slice(brace + 1);
      }
    }
  }
  s = s.replace("لا توجد تصنيفات ظاهرة", "{sb.noVisibleCategories}");
  s = s.replace(
    'label={grouped.rentalParent?.name_ar ?? "فساتين الإيجار"}',
    "label={grouped.rentalParent?.name_ar ?? sb.rentalFallback}"
  );
  s = s.replace(
    "أضيفي تصنيفاً فرعياً تحت فساتين الإيجار",
    "{sb.addRentalChild}"
  );
  s = s.replace(
    '{grouped.accessoriesParent?.name_ar ?? "إكسسوارات العروس"}',
    "{grouped.accessoriesParent?.name_ar ?? sb.accessoriesFallback}"
  );
  return s;
});

// --- BookingsManager (chrome only) ---
patch("src/components/admin/BookingsManager.tsx", (s) => {
  s = ensureUseLocale(s);
  if (!s.includes("bookingsUi")) {
    if (s.match(/const \{ t[^}]*\} = useLocale\(\)/)) {
      s = s.replace(
        /const \{ t[^}]*\} = useLocale\(\);/,
        (m) => m + "\n  const b = t.admin.bookingsUi;"
      );
    } else {
      s = s.replace(
        /export function BookingsManager[^{]*\{/,
        (m) => m + "\n  const { t } = useLocale();\n  const b = t.admin.bookingsUi;"
      );
    }
  }
  const reps = [
    ['label="تصفية حسب الحالة"', "label={b.filterStatus}"],
    ['label="نوع الخدمة"', "label={b.serviceType}"],
    ['{ value: "all", label: "الكل" }', '{ value: "all", label: b.all }'],
    [">العرض</p>", ">{b.visibility}</p>"],
    [">إضافة حجز يدوي</Button>", ">{b.addManual}</Button>"],
    [">التقويم</", ">{b.calendar}</"],
    [">تحديث</", ">{b.refresh}</"],
    [">تصدير CSV</", ">{b.exportCsv}</"],
    [">العميلة</th>", ">{b.colCustomer}</th>"],
    [">الموعد</th>", ">{b.colAppointment}</th>"],
    [">الخدمة</th>", ">{b.colService}</th>"],
    [">المصدر</th>", ">{b.colSource}</th>"],
    [">الحالة</th>", ">{b.colStatus}</th>"],
    [">إجراءات</th>", ">{b.colActions}</th>"],
    ['{loading ? "جاري التحميل..." : "لا توجد حجوزات"}', "{loading ? b.loading : b.empty}"],
    ["تخصيص كتابة", "{b.personalizationWriting}"],
    ["🎁 تغليف هدية", "{b.giftWrap}"],
    ["آخر رد:{\" \"}", "{b.lastReply}{\" \"}"],
    ["أُنشئ: {formatDate", "{b.createdAt} {formatDate"],
    ['aria-label="تغيير الحالة"', "aria-label={b.changeStatusAria}"],
    [">تفاصيل</", ">{b.details}</"],
    ['setSnack("تم نقل الحجز إلى سلة المحذوفات")', "setSnack(b.movedToTrash)"],
    ['? "تمت الأرشفة"\n                                    : "تم إلغاء الأرشفة"', "? b.archived\n                                    : b.unarchived"],
    ['throw new Error(data.error ?? "فشل التحديث")', "throw new Error(data.error ?? b.updateFailed)"],
    ['alert(e instanceof Error ? e.message : "حدث خطأ")', "alert(e instanceof Error ? e.message : b.genericError)"],
    ['setError(e instanceof Error ? e.message : "فشل جلب الحجوزات")', "setError(e instanceof Error ? e.message : b.loadFailed)"],
    ['throw new Error("استجابة غير صالحة من واجهة الحجوزات")', "throw new Error(b.invalidResponse)"],
  ];
  for (const [a0, b0] of reps) {
    if (!s.includes(a0)) console.warn("book MISS", JSON.stringify(a0).slice(0, 60));
    else s = s.split(a0).join(b0);
  }
  return s;
});

// --- MessagesManager ---
patch("src/components/admin/MessagesManager.tsx", (s) => {
  s = ensureUseLocale(s);
  if (!s.includes("messagesUi")) {
    if (s.match(/const \{ t[^}]*\} = useLocale\(\)/)) {
      s = s.replace(
        /const \{ t[^}]*\} = useLocale\(\);/,
        (m) => m + "\n  const mui = t.admin.messagesUi;"
      );
    } else {
      s = s.replace(
        /export function MessagesManager[^{]*\{/,
        (m) => m + "\n  const { t } = useLocale();\n  const mui = t.admin.messagesUi;"
      );
    }
  }
  if (!s.includes("formatMessage")) {
    s = s.replace(
      'import { useLocale } from "@/components/i18n/LocaleProvider";',
      'import { useLocale } from "@/components/i18n/LocaleProvider";\nimport { formatMessage } from "@/lib/i18n";'
    );
  }
  const reps = [
    [': "تعذّر تحميل الرسائل"', ": mui.loadFailed"],
    ['throw new Error("استجابة غير صالحة من الخادم")', "throw new Error(mui.invalidResponse)"],
    ['setLoadError(e instanceof Error ? e.message : "تعذّر تحميل الرسائل")', "setLoadError(e instanceof Error ? e.message : mui.loadFailed)"],
    ['const msg = data.error || "تعذّر إرسال الرد"', 'const msg = data.error || mui.sendFailed'],
    ['setReplyError("تعذّر الاتصال بالخادم. تحققي من الشبكة.")', "setReplyError(mui.networkError)"],
    ['setSnack("تعذّر النسخ")', "setSnack(mui.copyFailed)"],
    [">الرسائل</h1>", ">{mui.title}</h1>"],
    [
      "رسائل نموذج التواصل + رسائل حساب العميلة — الرد يصل للحساب والبريد",
      "{mui.subtitle}",
    ],
    [">تحديث</", ">{mui.refresh}</"],
    [">تصدير CSV</", ">{mui.exportCsv}</"],
    ['label="بحث"', "label={mui.search}"],
    ['placeholder="الاسم، البريد، الهاتف، الموضوع..."', "placeholder={mui.searchPlaceholder}"],
    [">العرض</p>", ">{mui.visibility}</p>"],
    ["تم نسخ {copyFlash}", "{formatMessage(mui.copied, { label: copyFlash })}"],
    ["لا توجد رسائل", "{mui.empty}"],
    [">من الحساب</", ">{mui.fromAccount}</"],
    [">تواصل</", ">{mui.contact}</"],
    [">جديدة</", ">{mui.unread}</"],
    [">مقروءة</span>", ">{mui.read}</span>"],
    [">تم الرد</", ">{mui.replied}</"],
    [">رد محلي</", ">{mui.localReply}</"],
    [">فشل الرد</", ">{mui.replyFailed}</"],
    ["آخر رد:{\" \"}", "{mui.lastReply}{\" \"}"],
    [">رد</", ">{mui.reply}</"],
    ["نسخ البريد", "{mui.copyEmail}"],
    ["نسخ الهاتف", "{mui.copyPhone}"],
    ["فتح mailto", "{mui.openMailto}"],
    ["تعليم كمقروءة", "{mui.markRead}"],
    ["تعليم كغير مقروءة", "{mui.markUnread}"],
    ['aria-label="إغلاق"', "aria-label={mui.close}"],
    ['setSnack("تم نقل الرسالة إلى سلة المحذوفات")', "setSnack(mui.movedToTrash)"],
  ];
  for (const [a0, b0] of reps) {
    if (!s.includes(a0)) console.warn("msg MISS", JSON.stringify(a0).slice(0, 60));
    else s = s.split(a0).join(b0);
  }
  return s;
});

console.log("done managers batch 1");
