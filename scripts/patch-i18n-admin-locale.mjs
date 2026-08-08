import fs from "fs";

const path = "src/lib/i18n/dictionaries.ts";
let s = fs.readFileSync(path, "utf8");

const dashAR = `
      chartRevenueMonthly: "الإيرادات شهرياً",
      chartOrdersDaily: "الطلبات يومياً",
      chartBookingsMonthly: "الحجوزات شهرياً",
      chartDeliveryVsPickup: "توصيل مقابل الاستلام",
      chartTopProducts: "أكثر المنتجات طلباً",
      chartTopCategories: "أكثر التصنيفات طلباً",
      chartTopRegions: "أكثر المناطق طلباً",
      chartEmpty: "لا توجد بيانات لهذه الفترة",
      chartDelivery: "توصيل",
      chartPickup: "استلام من البوتيك",
      alertOrdersPending: "طلبات بانتظار التأكيد",
      alertUnknownShipping: "مناطق شحن غير معروفة",
      alertPendingFees: "رسوم توصيل معلّقة",
      alertFailedNotifications: "إشعارات فاشلة",
      alertOutOfStock: "منتجات غير متوفرة / نفد المخزون",
`;

const dashHE = `
      chartRevenueMonthly: "הכנסות חודשיות",
      chartOrdersDaily: "הזמנות יומיות",
      chartBookingsMonthly: "פגישות חודשיות",
      chartDeliveryVsPickup: "משלוח מול איסוף",
      chartTopProducts: "המוצרים הנמכרים ביותר",
      chartTopCategories: "הקטגוריות המובילות",
      chartTopRegions: "האזורים המובילים",
      chartEmpty: "אין נתונים לתקופה זו",
      chartDelivery: "משלוח",
      chartPickup: "איסוף מהבוטיק",
      alertOrdersPending: "הזמנות ממתינות לאישור",
      alertUnknownShipping: "אזורי משלוח לא ידועים",
      alertPendingFees: "דמי משלוח ממתינים",
      alertFailedNotifications: "התראות שנכשלו",
      alertOutOfStock: "מוצרים לא זמינים / אזל מהמלאי",
`;

const dashEN = `
      chartRevenueMonthly: "Monthly revenue",
      chartOrdersDaily: "Daily orders",
      chartBookingsMonthly: "Monthly bookings",
      chartDeliveryVsPickup: "Delivery vs pickup",
      chartTopProducts: "Most ordered products",
      chartTopCategories: "Top categories",
      chartTopRegions: "Top regions",
      chartEmpty: "No data for this period",
      chartDelivery: "Delivery",
      chartPickup: "Boutique pickup",
      alertOrdersPending: "Orders awaiting confirmation",
      alertUnknownShipping: "Unknown shipping regions",
      alertPendingFees: "Pending delivery fees",
      alertFailedNotifications: "Failed notifications",
      alertOutOfStock: "Unavailable / out of stock products",
`;

function mustReplace(src, re, repl, label) {
  if (!re.test(src)) throw new Error(`missing pattern: ${label}`);
  return src.replace(re, repl);
}

s = mustReplace(
  s,
  /(rangeLastYear: "السنة الماضية",\n)(    \},\n    galleryAdmin:)/,
  `$1${dashAR}$2`,
  "dashAR"
);
s = mustReplace(
  s,
  /(rangeLastYear: "השנה שעברה",\n)(    \},\n    galleryAdmin:)/,
  `$1${dashHE}$2`,
  "dashHE"
);
s = mustReplace(
  s,
  /(rangeLastYear: "Last year",\n)(    \},\n    galleryAdmin:)/,
  `$1${dashEN}$2`,
  "dashEN"
);

if (!s.includes('pageTitle: "إدارة المنتجات"')) {
  s = mustReplace(
    s,
    /productsUi: \{\n      search: "بحث",/,
    `productsUi: {\n      pageTitle: "إدارة المنتجات",\n      pageSubtitle: "إدارة التصنيفات الديناميكية",\n      search: "بحث",`,
    "productsAR"
  );
}
if (!s.includes('pageTitle: "ניהול מוצרים"')) {
  s = mustReplace(
    s,
    /productsUi: \{\n      search: "חיפוש",/,
    `productsUi: {\n      pageTitle: "ניהול מוצרים",\n      pageSubtitle: "ניהול קטגוריות דינמיות",\n      search: "חיפוש",`,
    "productsHE"
  );
}
if (!s.includes('pageTitle: "Product management"')) {
  s = mustReplace(
    s,
    /productsUi: \{\n      search: "Search",/,
    `productsUi: {\n      pageTitle: "Product management",\n      pageSubtitle: "Manage dynamic categories",\n      search: "Search",`,
    "productsEN"
  );
}

const expAR = `    experienceUi: {
      eyebrow: "لوحة التجربة",
      overviewTitle: "محرك التجربة",
      overview: "نظرة عامة",
      features: "الميزات",
      services: "الخدمات",
      productTypes: "أنواع المنتجات",
      purchaseFlows: "مسارات الشراء",
      templates: "القوالب",
      preview: "معاينة",
      featuresDesc: "فعّلي ما يظهر للعميلة على كل منتج.",
      servicesDesc: "تغليف · صندوق فاخر · توصيل سريع.",
      productTypesDesc: "إيجار · إكسسوار · تصميم خاص.",
      purchaseFlowsDesc: "أزرار الشراء وخطوات التجربة.",
      templatesDesc: "ابدئي بسرعة من قالب جاهز.",
      previewDesc: "شاهدي سلوك كل نوع قبل النشر.",
      servicesPageTitle: "الخدمات",
      servicesPageDesc: "مدير الخدمات العالمية — نفس المكتبة المستخدمة في إعدادات المتجر وتجربة المنتج.",
      servicesHint: "نفس مكتبة الخدمات العالمية. تُدار أيضاً من إعدادات المتجر — مصدر واحد للحقيقة.",
      saveServices: "حفظ الخدمات",
      loadFailed: "تعذّر تحميل الخدمات — تأكدي من إعدادات المتجر",
      saved: "تم حفظ الخدمات",
      saveFailed: "فشل الحفظ",
      loading: "جاري التحميل…",
      nameAr: "الاسم (عربي)",
      nameEn: "Name (EN)",
      enabled: "مفعّل",
      visible: "ظاهر",
      required: "إلزامي",
      scopeAll: "كل المنتجات",
      scopeProductTypes: "حسب نوع المنتج",
      scopeCategories: "حسب معرفات التصنيفات",
      scopeCollections: "حسب معرفات المجموعات",
      scopeProducts: "حسب معرفات المنتجات",
    },
`;

const expHE = `    experienceUi: {
      eyebrow: "לוח החוויה",
      overviewTitle: "מנוע חוויה",
      overview: "סקירה",
      features: "תכונות",
      services: "שירותים",
      productTypes: "סוגי מוצרים",
      purchaseFlows: "מסלולי רכישה",
      templates: "תבניות",
      preview: "תצוגה מקדימה",
      featuresDesc: "הפעילי מה שמוצג ללקוחה בכל מוצר.",
      servicesDesc: "עטיפת מתנה · קופסה יוקרתית · משלוח מהיר.",
      productTypesDesc: "השכרה · אקססוריז · עיצוב מותאם.",
      purchaseFlowsDesc: "כפתורי רכישה ושלבים בחוויה.",
      templatesDesc: "התחילי במהירות מתבנית מוכנה.",
      previewDesc: "ראי איך כל סוג מתנהג לפני הפרסום.",
      servicesPageTitle: "שירותים",
      servicesPageDesc: "מנהל השירותים הגלובלי — אותה ספרייה כמו בהגדרות החנות ובחוויית המוצר.",
      servicesHint: "אותה ספריית שירותים גלובלית. מנוהלת גם מהגדרות החנות — מקור אמת אחד.",
      saveServices: "שמירת שירותים",
      loadFailed: "טעינת השירותים נכשלה — בדקי את הגדרות החנות",
      saved: "השירותים נשמרו",
      saveFailed: "השמירה נכשלה",
      loading: "טוען…",
      nameAr: "שם (ערבית)",
      nameEn: "Name (EN)",
      enabled: "פעיל",
      visible: "גלוי",
      required: "חובה",
      scopeAll: "כל המוצרים",
      scopeProductTypes: "לפי סוג מוצר",
      scopeCategories: "לפי מזהי קטגוריות",
      scopeCollections: "לפי מזהי אוספים",
      scopeProducts: "לפי מזהי מוצרים",
    },
`;

const expEN = `    experienceUi: {
      eyebrow: "Experience panel",
      overviewTitle: "Experience engine",
      overview: "Overview",
      features: "Features",
      services: "Services",
      productTypes: "Product types",
      purchaseFlows: "Purchase flows",
      templates: "Templates",
      preview: "Preview",
      featuresDesc: "Control what shoppers see on each product.",
      servicesDesc: "Gift wrap · luxury box · express delivery.",
      productTypesDesc: "Rental · accessory · custom design.",
      purchaseFlowsDesc: "Purchase buttons and experience steps.",
      templatesDesc: "Start quickly from a ready template.",
      previewDesc: "See how each type behaves before publishing.",
      servicesPageTitle: "Services",
      servicesPageDesc: "Global services manager — same library used in store settings and product experience.",
      servicesHint: "Same global services library. Also managed from store settings — single source of truth.",
      saveServices: "Save services",
      loadFailed: "Could not load services — check store settings",
      saved: "Services saved",
      saveFailed: "Save failed",
      loading: "Loading…",
      nameAr: "Name (AR)",
      nameEn: "Name (EN)",
      enabled: "Enabled",
      visible: "Visible",
      required: "Required",
      scopeAll: "All products",
      scopeProductTypes: "By product type",
      scopeCategories: "By category IDs",
      scopeCollections: "By collection IDs",
      scopeProducts: "By product IDs",
    },
`;

if (!s.includes("experienceUi:")) {
  let count = 0;
  s = s.replace(/(\n    lifecycleUi: \{)/g, (m) => {
    count += 1;
    if (count === 1) return `\n${expAR}${m.trimStart()}`;
    if (count === 2) return `\n${expHE}${m.trimStart()}`;
    if (count === 3) return `\n${expEN}${m.trimStart()}`;
    return m;
  });
  if (count !== 3) throw new Error(`lifecycleUi count ${count}`);
}

fs.writeFileSync(path, s);
console.log("dictionaries patched ok");
