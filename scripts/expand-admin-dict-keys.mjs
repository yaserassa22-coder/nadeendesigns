import fs from "fs";

const root = "C:/Users/malma/Desktop/nadeendesigns";

function expandCustomersKeys() {
  const extraType = `
      subtitle: string;
      exportCsv: string;
      visibility: string;
      colName: string;
      colPhone: string;
      colEmail: string;
      colActions: string;
      loading: string;
      emptyHint: string;
      profile: string;
      delete: string;
      deleteTitle: string;
      deleteConfirm: string;
      moveToTrash: string;
      movedToTrash: string;
      search: string;`;

  const typesPath = `${root}/src/lib/i18n/types.ts`;
  let types = fs.readFileSync(typesPath, "utf8");
  if (!types.includes("customersUi: {") || types.includes("emptyHint: string")) {
    if (!types.includes("emptyHint: string")) {
      types = types.replace(
        `customersUi: {
      title: string;
      searchPlaceholder: string;
      empty: string;
      refresh: string;
      loadFailed: string;
    };`,
        `customersUi: {
      title: string;
      subtitle: string;
      search: string;
      searchPlaceholder: string;
      empty: string;
      emptyHint: string;
      refresh: string;
      loadFailed: string;
      exportCsv: string;
      visibility: string;
      colName: string;
      colPhone: string;
      colEmail: string;
      colActions: string;
      loading: string;
      profile: string;
      delete: string;
      deleteTitle: string;
      deleteConfirm: string;
      moveToTrash: string;
      movedToTrash: string;
    };`
      );
      fs.writeFileSync(typesPath, types);
      console.log("types customersUi expanded");
    } else console.log("types already expanded");
  }

  const dictPath = `${root}/src/lib/i18n/dictionaries.ts`;
  let dict = fs.readFileSync(dictPath, "utf8");

  const replacements = [
    [
      `customersUi: {
      title: "العملاء",
      searchPlaceholder: "بحث بالاسم أو الهاتف أو البريد…",
      empty: "لا يوجد عملاء",
      refresh: "تحديث",
      loadFailed: "تعذّر تحميل العملاء",
    },`,
      `customersUi: {
      title: "العملاء",
      subtitle: "طبقة إدارة فوق مفاتيح العملاء (هاتف/بريد) — ليست CRM كاملة.",
      search: "بحث",
      searchPlaceholder: "الاسم، الهاتف، البريد...",
      empty: "لا يوجد عملاء",
      emptyHint: "لا يوجد عملاء في الطبقة الإدارية بعد. تُنشأ السجلات عند الأرشفة/الحذف.",
      refresh: "تحديث",
      loadFailed: "فشل جلب العملاء",
      exportCsv: "تصدير CSV",
      visibility: "العرض",
      colName: "الاسم",
      colPhone: "الهاتف",
      colEmail: "البريد",
      colActions: "إجراءات",
      loading: "جاري التحميل...",
      profile: "ملف العميل",
      delete: "حذف",
      deleteTitle: "نقل العميل إلى سلة المحذوفات؟",
      deleteConfirm: "سيتم إخفاء العميل من قائمة العملاء النشطة. يمكن استعادته لاحقاً من سلة المحذوفات. الطلبات والحجوزات المرتبطة لا تُحذف.",
      moveToTrash: "نقل إلى السلة",
      movedToTrash: "تم نقل العميل إلى سلة المحذوفات",
    },`,
    ],
    [
      `customersUi: {
      title: "לקוחות",
      searchPlaceholder: "חיפוש לפי שם, טלפון או אימייל…",
      empty: "אין לקוחות",
      refresh: "רענון",
      loadFailed: "טעינת הלקוחות נכשלה",
    },`,
      `customersUi: {
      title: "לקוחות",
      subtitle: "שכבת ניהול מעל מפתחות לקוחות (טלפון/אימייל) — לא CRM מלא.",
      search: "חיפוש",
      searchPlaceholder: "שם, טלפון, אימייל...",
      empty: "אין לקוחות",
      emptyHint: "עדיין אין לקוחות בשכבת הניהול. רשומות נוצרות בארכוב/מחיקה.",
      refresh: "רענון",
      loadFailed: "טעינת הלקוחות נכשלה",
      exportCsv: "ייצוא CSV",
      visibility: "תצוגה",
      colName: "שם",
      colPhone: "טלפון",
      colEmail: "אימייל",
      colActions: "פעולות",
      loading: "טוען...",
      profile: "פרופיל לקוח",
      delete: "מחיקה",
      deleteTitle: "להעביר את הלקוח לפח?",
      deleteConfirm: "הלקוח יוסתר מרשימת הלקוחות הפעילים. ניתן לשחזר מהפח. הזמנות ותורים קשורים לא נמחקים.",
      moveToTrash: "העבר לפח",
      movedToTrash: "הלקוח הועבר לפח",
    },`,
    ],
    [
      `customersUi: {
      title: "Customers",
      searchPlaceholder: "Search by name, phone, or email…",
      empty: "No customers",
      refresh: "Refresh",
      loadFailed: "Failed to load customers",
    },`,
      `customersUi: {
      title: "Customers",
      subtitle: "Admin overlay on customer keys (phone/email) — not a full CRM.",
      search: "Search",
      searchPlaceholder: "Name, phone, email...",
      empty: "No customers",
      emptyHint: "No admin overlay customers yet. Records are created on archive/delete.",
      refresh: "Refresh",
      loadFailed: "Failed to load customers",
      exportCsv: "Export CSV",
      visibility: "Visibility",
      colName: "Name",
      colPhone: "Phone",
      colEmail: "Email",
      colActions: "Actions",
      loading: "Loading...",
      profile: "Customer profile",
      delete: "Delete",
      deleteTitle: "Move customer to trash?",
      deleteConfirm: "The customer will be hidden from the active list. You can restore later from trash. Related orders and bookings are not deleted.",
      moveToTrash: "Move to trash",
      movedToTrash: "Customer moved to trash",
    },`,
    ],
  ];

  for (const [a, b] of replacements) {
    if (!dict.includes(a)) {
      console.warn("customers block miss");
      continue;
    }
    dict = dict.replace(a, b);
  }
  fs.writeFileSync(dictPath, dict);
  console.log("dict customers expanded");
}

function expandNotifEmailKeys() {
  const typesPath = `${root}/src/lib/i18n/types.ts`;
  let types = fs.readFileSync(typesPath, "utf8");
  if (!types.includes("senderTitle: string")) {
    types = types.replace(
      `notificationsAdmin: {
      title: string;
      save: string;
      saved: string;
      saveFailed: string;
    };`,
      `notificationsAdmin: {
      title: string;
      senderTitle: string;
      senderHint: string;
      senderName: string;
      replyEmail: string;
      businessPhone: string;
      paymentTitle: string;
      paymentInstructions: string;
      paymentLink: string;
      whatsappTemplates: string;
      whatsappTemplatesHint: string;
      emailSubjects: string;
      emailSubjectsHint: string;
      save: string;
      saved: string;
      saveFailed: string;
      genericError: string;
    };`
    );
    types = types.replace(
      `emailProvider: {
      title: string;
      save: string;
      test: string;
      saved: string;
      saveFailed: string;
    };`,
      `emailProvider: {
      title: string;
      save: string;
      test: string;
      saved: string;
      saveFailed: string;
      loading: string;
      statusTitle: string;
      connectionTitle: string;
      connectionHint: string;
      enableSending: string;
      enableSendingHint: string;
      deliveryMode: string;
      localMode: string;
      localModeHint: string;
      resendMode: string;
      resendModeHint: string;
      apiKey: string;
      apiKeyKeep: string;
      clearKey: string;
      fromAddress: string;
      senderName: string;
      replyTo: string;
      adminNotifyEmail: string;
      saveConnection: string;
      testTitle: string;
      testHint: string;
      testTo: string;
      sendTest: string;
      genericError: string;
      loadFailed: string;
      clearConfirm: string;
      cleared: string;
      clearFailed: string;
      testFailed: string;
    };`
    );
    fs.writeFileSync(typesPath, types);
    console.log("types notif/email expanded");
  }

  // For dictionaries, replace the small blocks with richer ones in ar/he/en
  const dictPath = `${root}/src/lib/i18n/dictionaries.ts`;
  let dict = fs.readFileSync(dictPath, "utf8");

  const blocks = {
    ar: {
      from: `notificationsAdmin: {
      title: "إعدادات الإشعارات",
      save: "حفظ",
      saved: "تم الحفظ",
      saveFailed: "فشل الحفظ",
    },
    emailProvider: {
      title: "مزوّد البريد",
      save: "حفظ",
      test: "اختبار",
      saved: "تم الحفظ",
      saveFailed: "فشل الحفظ",
    },`,
      to: `notificationsAdmin: {
      title: "إعدادات الإشعارات",
      senderTitle: "بيانات المرسل",
      senderHint: "تظهر في رسائل الإيميل والواتساب",
      senderName: "اسم المرسل",
      replyEmail: "بريد الرد",
      businessPhone: "هاتف العمل / واتساب",
      paymentTitle: "طلب الدفعة",
      paymentInstructions: "تعليمات الدفع",
      paymentLink: "رابط الدفع (اختياري — للمستقبل)",
      whatsappTemplates: "قوالب واتساب حسب الحالة",
      whatsappTemplatesHint: "السطر الرئيسي للرسالة — اتركي فارغاً لاستخدام الافتراضي",
      emailSubjects: "عناوين إيميل حسب الحالة",
      emailSubjectsHint: "اختياري — اتركي فارغاً لاستخدام العنوان التلقائي",
      save: "حفظ إعدادات الإشعارات",
      saved: "تم حفظ إعدادات الإشعارات",
      saveFailed: "فشل الحفظ",
      genericError: "حدث خطأ",
    },
    emailProvider: {
      title: "مزوّد البريد",
      save: "حفظ",
      test: "اختبار",
      saved: "تم حفظ إعدادات البريد",
      saveFailed: "فشل الحفظ",
      loading: "جاري تحميل إعدادات البريد…",
      statusTitle: "حالة البريد",
      connectionTitle: "اتصال Resend (بدون تعديل كود)",
      connectionHint: "محلياً: اختاري «محلي». بعد شراء Resend وتوثيق النطاق: الصقي المفتاح، ضعي FROM من نطاقك، واختاري «Resend».",
      enableSending: "تفعيل إرسال البريد",
      enableSendingHint: "يتوافق أيضاً مع إعدادات المتجر → قنوات الإشعارات",
      deliveryMode: "وضع التسليم",
      localMode: "محلي (الآن)",
      localModeHint: "الرسائل والردود تُحفظ وتعمل في الموقع دون إرسال خارجي — مثالي قبل النطاق وResend",
      resendMode: "Resend (إنتاج)",
      resendModeHint: "إرسال حقيقي عبر Resend — يحتاج مفتاح API و FROM من نطاق موثّق",
      apiKey: "مفتاح Resend API",
      apiKeyKeep: "اتركي فارغاً للإبقاء على المفتاح الحالي",
      clearKey: "مسح المفتاح المحفوظ",
      fromAddress: "عنوان المرسل (FROM)",
      senderName: "اسم المرسل",
      replyTo: "بريد الرد (Reply-To)",
      adminNotifyEmail: "بريد إشعارات الإدارة",
      saveConnection: "حفظ اتصال البريد",
      testTitle: "اختبار الإرسال",
      testHint: "في الوضع المحلي يُسجَّل الاختبار دون إرسال خارجي. في وضع Resend تُرسل رسالة حقيقية.",
      testTo: "إلى",
      sendTest: "إرسال اختبار",
      genericError: "حدث خطأ",
      loadFailed: "تعذّر تحميل إعدادات البريد",
      clearConfirm: "إزالة مفتاح Resend المحفوظ في الإدارة؟ (يبقى مفتاح البيئة إن وُجد)",
      cleared: "تم مسح مفتاح Resend من إعدادات الإدارة",
      clearFailed: "فشل المسح",
      testFailed: "فشل إرسال بريد الاختبار",
    },`,
    },
    he: {
      from: `notificationsAdmin: {
      title: "הגדרות התראות",
      save: "שמירה",
      saved: "נשמר",
      saveFailed: "השמירה נכשלה",
    },
    emailProvider: {
      title: "ספק אימייל",
      save: "שמירה",
      test: "בדיקה",
      saved: "נשמר",
      saveFailed: "השמירה נכשלה",
    },`,
      to: `notificationsAdmin: {
      title: "הגדרות התראות",
      senderTitle: "פרטי שולח",
      senderHint: "מופיעים בהודעות אימייל ווואטסאפ",
      senderName: "שם השולח",
      replyEmail: "אימייל לתשובה",
      businessPhone: "טלפון עסק / וואטסאפ",
      paymentTitle: "בקשת תשלום",
      paymentInstructions: "הוראות תשלום",
      paymentLink: "קישור תשלום (אופציונלי)",
      whatsappTemplates: "תבניות וואטסאפ לפי סטטוס",
      whatsappTemplatesHint: "שורת ההודעה הראשית — השאירו ריק לברירת מחדל",
      emailSubjects: "נושאי אימייל לפי סטטוס",
      emailSubjectsHint: "אופציונלי — השאירו ריק לנושא אוטומטי",
      save: "שמירת הגדרות התראות",
      saved: "הגדרות ההתראות נשמרו",
      saveFailed: "השמירה נכשלה",
      genericError: "אירעה שגיאה",
    },
    emailProvider: {
      title: "ספק אימייל",
      save: "שמירה",
      test: "בדיקה",
      saved: "הגדרות האימייל נשמרו",
      saveFailed: "השמירה נכשלה",
      loading: "טוען הגדרות אימייל…",
      statusTitle: "סטטוס אימייל",
      connectionTitle: "חיבור Resend (ללא שינוי קוד)",
      connectionHint: "מקומי: בחרו «מקומי». אחרי Resend ודומיין מאומת: הדביקו מפתח, הגדירו FROM ובחרו «Resend».",
      enableSending: "הפעלת שליחת אימייל",
      enableSendingHint: "מסונכרן גם עם הגדרות החנות → ערוצי התראות",
      deliveryMode: "מצב משלוח",
      localMode: "מקומי (עכשיו)",
      localModeHint: "הודעות נשמרות באתר ללא שליחה חיצונית",
      resendMode: "Resend (ייצור)",
      resendModeHint: "שליחה אמיתית דרך Resend — דורש API key ו-FROM מדומיין מאומת",
      apiKey: "מפתח Resend API",
      apiKeyKeep: "השאירו ריק כדי לשמור את המפתח הנוכחי",
      clearKey: "מחק מפתח שמור",
      fromAddress: "כתובת שולח (FROM)",
      senderName: "שם השולח",
      replyTo: "Reply-To",
      adminNotifyEmail: "אימייל התראות ניהול",
      saveConnection: "שמירת חיבור אימייל",
      testTitle: "בדיקת שליחה",
      testHint: "במצב מקומי נרשמת בדיקה ללא שליחה חיצונית. ב-Resend נשלחת הודעה אמיתית.",
      testTo: "אל",
      sendTest: "שליחת בדיקה",
      genericError: "אירעה שגיאה",
      loadFailed: "טעינת הגדרות האימייל נכשלה",
      clearConfirm: "להסיר מפתח Resend השמור בניהול? (מפתח הסביבה נשאר אם קיים)",
      cleared: "מפתח Resend נמחק מהגדרות הניהול",
      clearFailed: "המחיקה נכשלה",
      testFailed: "שליחת אימייל הבדיקה נכשלה",
    },`,
    },
    en: {
      from: `notificationsAdmin: {
      title: "Notification settings",
      save: "Save",
      saved: "Saved",
      saveFailed: "Save failed",
    },
    emailProvider: {
      title: "Email provider",
      save: "Save",
      test: "Test",
      saved: "Saved",
      saveFailed: "Save failed",
    },`,
      to: `notificationsAdmin: {
      title: "Notification settings",
      senderTitle: "Sender details",
      senderHint: "Shown in email and WhatsApp messages",
      senderName: "Sender name",
      replyEmail: "Reply-to email",
      businessPhone: "Business phone / WhatsApp",
      paymentTitle: "Payment request",
      paymentInstructions: "Payment instructions",
      paymentLink: "Payment link (optional — future)",
      whatsappTemplates: "WhatsApp templates by status",
      whatsappTemplatesHint: "Main message line — leave empty to use the default",
      emailSubjects: "Email subjects by status",
      emailSubjectsHint: "Optional — leave empty for the automatic subject",
      save: "Save notification settings",
      saved: "Notification settings saved",
      saveFailed: "Save failed",
      genericError: "Something went wrong",
    },
    emailProvider: {
      title: "Email provider",
      save: "Save",
      test: "Test",
      saved: "Email settings saved",
      saveFailed: "Save failed",
      loading: "Loading email settings…",
      statusTitle: "Email status",
      connectionTitle: "Resend connection (no code changes)",
      connectionHint: "Locally: choose «Local». After buying Resend and verifying a domain: paste the key, set FROM from your domain, choose «Resend».",
      enableSending: "Enable email sending",
      enableSendingHint: "Also aligns with Store settings → notification channels",
      deliveryMode: "Delivery mode",
      localMode: "Local (now)",
      localModeHint: "Messages are saved on-site without external sending — ideal before domain + Resend",
      resendMode: "Resend (production)",
      resendModeHint: "Real sending via Resend — needs API key and FROM from a verified domain",
      apiKey: "Resend API key",
      apiKeyKeep: "Leave empty to keep the current key",
      clearKey: "Clear saved key",
      fromAddress: "From address",
      senderName: "Sender name",
      replyTo: "Reply-To",
      adminNotifyEmail: "Admin notification email",
      saveConnection: "Save email connection",
      testTitle: "Send test",
      testHint: "In local mode the test is logged without external sending. In Resend mode a real message is sent.",
      testTo: "To",
      sendTest: "Send test",
      genericError: "Something went wrong",
      loadFailed: "Failed to load email settings",
      clearConfirm: "Remove the Resend key saved in admin? (env key remains if present)",
      cleared: "Resend key cleared from admin settings",
      clearFailed: "Clear failed",
      testFailed: "Test email failed",
    },`,
    },
  };

  for (const loc of Object.keys(blocks)) {
    const { from, to } = blocks[loc];
    if (!dict.includes(from)) {
      console.warn("notif block miss", loc);
      continue;
    }
    dict = dict.replace(from, to);
  }
  fs.writeFileSync(dictPath, dict);
  console.log("dict notif/email expanded");
}

expandCustomersKeys();
expandNotifEmailKeys();
