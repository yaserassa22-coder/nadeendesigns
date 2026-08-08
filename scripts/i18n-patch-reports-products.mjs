/**
 * Patch ReportsCenter KPIs + Dresses/Shop/Categories list chrome
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

// ---- ReportsCenter ----
patch("src/components/admin/reports/ReportsCenter.tsx", (s) => {
  if (!s.includes("formatMessage")) {
    s = s.replace(
      'import { useLocale } from "@/components/i18n/LocaleProvider";',
      'import { useLocale } from "@/components/i18n/LocaleProvider";\nimport { formatMessage } from "@/lib/i18n";'
    );
  }
  const reps = [
    ['setError("غير مصرح بتصدير التقارير المالية")', "setError(r.exportDenied)"],
    ['setEmailMsg(json.error || "فشل الإرسال")', "setEmailMsg(json.error || r.sendFailed)"],
    ['setEmailMsg("تم إرسال التقرير بنجاح")', "setEmailMsg(r.emailSent)"],
    ['setEmailMsg(e instanceof Error ? e.message : "فشل الإرسال")', "setEmailMsg(e instanceof Error ? e.message : r.sendFailed)"],
    ['setScheduleMsg(json.error || "فشل الحفظ")', "setScheduleMsg(json.error || r.saveFailed)"],
    [
      `"تم حفظ الجدول (مستقبلي — لن يُرسل تلقائياً حتى يتوفر المشغّل)."`,
      "r.scheduleSaved",
    ],
    ['setScheduleMsg(e instanceof Error ? e.message : "فشل الحفظ")', "setScheduleMsg(e instanceof Error ? e.message : r.saveFailed)"],
    ["تاريخ الإنشاء: {new Date().toLocaleString(\"ar-SA\")}", "{r.createdAt} {new Date().toLocaleString()}"],
    ['title="إجمالي الإيرادات"', "title={r.kpiGrossRevenue}"],
    ['title="صافي الإيرادات"', "title={r.kpiNetRevenue}"],
    ['title="عدد الطلبات"', "title={r.kpiOrdersCount}"],
    ['title="متوسط قيمة الطلب"', "title={r.kpiAov}"],
    ['title="منتجات مباعة"', "title={r.kpiProductsSold}"],
    ['title="متوسط رسوم الشحن"', "title={r.kpiAvgShipping}"],
    ['title="متوسط الخصم"', "title={r.kpiAvgDiscount}"],
    ['title="طلبات معلّقة"', "title={r.kpiPendingOrders}"],
    ['title="حجوزات جديدة"', "title={r.kpiNewBookings}"],
    ['title="مؤكدة"', "title={r.kpiConfirmed}"],
    ['title="مكتملة"', "title={r.kpiCompleted}"],
    ['title="ملغاة"', "title={r.kpiCancelled}"],
    ['title="لم تحضر"', "title={r.kpiNoShow}"],
    ['title="نسبة الإلغاء %"', "title={r.kpiCancelRate}"],
    ['title="نسبة عدم الحضور %"', "title={r.kpiNoShowRate}"],
    ['title="إيرادات الحجوزات"', "title={r.kpiBookingRevenue}"],
    ['hint="مستقبلي — لا يوجد سعر للحجز بعد"', "hint={r.kpiBookingRevenueHint}"],
    ['title="عملاء جدد"', "title={r.kpiNewCustomers}"],
    ['title="عملاء عائدون"', "title={r.kpiReturning}"],
    ['title="متوسط الإنفاق"', "title={r.kpiAvgSpend}"],
    ['title="طلبات لكل عميل"', "title={r.kpiOrdersPerCustomer}"],
    ['title="توصيل"', "title={r.kpiDelivery}"],
    ['title="استلام من البوتيك"', "title={r.kpiPickup}"],
    ['title="متوسط تكلفة الشحن"', "title={r.kpiAvgShipCost}"],
    ['title="رسوم معلّقة"', "title={r.kpiPendingFees}"],
    ['title="متوسط وقت التوصيل"', "title={r.kpiAvgDeliveryTime}"],
    ['hint="مستقبلي — يحتاج طوابع حالات"', "hint={r.kpiAvgDeliveryHint}"],
    [
      "`${data.shipping.avgDeliveryTimeHours} س`",
      "formatMessage(r.hoursShort, { n: data.shipping.avgDeliveryTimeHours })",
    ],
    ['title="الإجمالي (Gross)"', "title={r.kpiGross}"],
    ['title="الصافي (Net)"', "title={r.kpiNet}"],
    ['title="دخل الشحن"', "title={r.kpiShipIncome}"],
    ['title="خصومات ممنوحة"', "title={r.kpiDiscounts}"],
    ['title="المستردات"', "title={r.kpiRefunds}"],
    ['hint="مستقبلي"', "hint={r.future}"],
    ['title="قيمة معلّقة"', "title={r.kpiPendingValue}"],
    ['title="رؤى الأعمال"', "title={r.businessInsights}"],
    ['title="أفضل المنتجات مبيعاً"', "title={r.topProducts}"],
    ['headers={["المنتج", "الكمية", "الطلبات", "الإيرادات"]}', 'headers={[r.colProduct, r.colQty, r.colOrders, r.colRevenue]}'],
    ['title="أقل المنتجات مبيعاً"', "title={r.lowProducts}"],
    ['headers={["المنتج", "الكمية", "الإيرادات"]}', 'headers={[r.colProduct, r.colQty, r.colRevenue]}'],
    ['title="لم تُطلب أبداً"', "title={r.neverOrdered}"],
    ['headers={["المنتج", "النوع"]}', 'headers={[r.colProduct, r.colType]}'],
    ['title="أعلى إيراداً"', "title={r.topRevenue}"],
    ['headers={["المنتج", "الإيرادات", "الكمية"]}', 'headers={[r.colProduct, r.colRevenue, r.colQty]}'],
    ['title="الأعلى مشاهدة"', "title={r.mostViewed}"],
    ["مستقبلي — تتبّع المشاهدات غير مفعّل بعد.", "{r.mostViewedHint}"],
    ['title="أفضل التصنيفات"', "title={r.topCategories}"],
    ['headers={["التصنيف", "الكمية", "الإيرادات"]}', 'headers={[r.colCategory, r.colQty, r.colRevenue]}'],
    ['title="إيرادات التصنيفات"', "title={r.categoryRevenue}"],
    ['headers={["التصنيف", "الطلبات", "الإيرادات"]}', 'headers={[r.colCategory, r.colOrders, r.colRevenue]}'],
    ['title="أكثر العملاء طلباً"', "title={r.topCustomersOrders}"],
    ['headers={["الاسم", "الطلبات", "الإنفاق"]}', 'headers={[r.colName, r.colOrders, r.colSpend]}'],
    ['title="أعلى إنفاقاً"', "title={r.topSpenders}"],
    ['headers={["الاسم", "الجوال", "الإنفاق"]}', 'headers={[r.colName, r.colPhone, r.colSpend]}'],
    ['title="أكثر الخدمات طلباً"', "title={r.topServices}"],
    ['headers={["الخدمة", "العدد"]}', 'headers={[r.colService, r.colCount]}'],
    ['title="الساعات الأكثر ازدحامًا"', "title={r.peakHours}"],
    ['headers={["الساعة", "العدد"]}', 'headers={[r.colHour, r.colCount]}'],
    ['title="الأيام الأكثر ازدحامًا"', "title={r.peakDays}"],
    ['headers={["اليوم", "العدد"]}', 'headers={[r.colDay, r.colCount]}'],
    ['title="حسب مصدر الحجز"', "title={r.bySource}"],
    ['headers={["المصدر", "العدد"]}', 'headers={[r.colSource, r.colCount]}'],
    ['title="أكثر المناطق اختياراً"', "title={r.topRegions}"],
    ['headers={["المنطقة", "العدد"]}', 'headers={[r.colRegion, r.colCount]}'],
    ['title="إرسال التقرير بالبريد"', "title={r.emailReport}"],
    ['label="البريد الإلكتروني"', "label={r.emailLabel}"],
    [">قالب الفترة</span>", ">{r.periodTemplate}</span>"],
    ['<option value="daily">يومي</option>', '<option value="daily">{r.daily}</option>'],
    ['<option value="weekly">أسبوعي</option>', '<option value="weekly">{r.weekly}</option>'],
    ['<option value="monthly">شهري</option>', '<option value="monthly">{r.monthly}</option>'],
    ['<option value="custom">حسب الفلاتر الحالية</option>', '<option value="custom">{r.customFilters}</option>'],
    ['{emailBusy ? "جاري الإرسال..." : "إرسال الآن"}', "{emailBusy ? r.sending : r.sendNow}"],
    ['title="جدولة التقارير (مستقبلي)"', "title={r.scheduleTitle}"],
    [
      `يُحفظ الجدول في قاعدة البيانات فقط. لن يُرسل تلقائياً حتى يتوفر مشغّل
            الجدولة (cron).`,
      `{r.scheduleHint}`,
    ],
    ['label="البريد"', "label={r.emailLabel}"],
    [">التكرار</span>", ">{r.frequency}</span>"],
    ["حفظ الجدول", "{r.saveSchedule}"],
  ];
  for (const [a, b] of reps) {
    if (!s.includes(a)) console.warn("rep miss", a.slice(0, 45));
    else s = s.split(a).join(b);
  }
  return s;
});

// ---- DressesManager ----
patch("src/components/admin/DressesManager.tsx", (s) => {
  if (!s.includes("useLocale")) {
    s = s.replace(
      '"use client";\n',
      '"use client";\n\nimport { useLocale } from "@/components/i18n/LocaleProvider";\n'
    );
  }
  if (!s.includes("productsUi")) {
    // Find main export function
    const m = s.match(/export function DressesManager[^{]*\{/);
    if (m) {
      s = s.replace(m[0], m[0] + "\n  const { t } = useLocale();\n  const p = t.admin.productsUi;");
    }
  }
  const reps = [
    ['?.name_ar ?? "تصنيف مقفل"', "?.name_ar ?? p.lockedCategory"],
    ['label="بحث"', "label={p.search}"],
    ['placeholder="بحث عن منتج، SKU…"', "placeholder={p.searchSkuPlaceholder}"],
    ['label="تصفية حسب التصنيف"', "label={p.filterCategory}"],
    ['{ value: "all", label: "كل التصنيفات" }', '{ value: "all", label: p.allCategories }'],
    ['label="الحالة"', "label={p.status}"],
    ['{ value: "all", label: "الكل" }', '{ value: "all", label: p.all }'],
    ['label="التوفر"', "label={p.availability}"],
    ['{ value: "yes", label: "متوفر" }', '{ value: "yes", label: p.available }'],
    ['{ value: "no", label: "غير متوفر" }', '{ value: "no", label: p.unavailable }'],
    ['label="مميز"', "label={p.featured}"],
    ['{ value: "yes", label: "مميز" }', '{ value: "yes", label: p.featured }'],
    ['{ value: "no", label: "غير مميز" }', '{ value: "no", label: p.notFeatured }'],
    [">العرض</p>", ">{p.visibility}</p>"],
    ['? "إضافة فستان نوف"\n            : "إضافة منتج"', "? p.addNouf\n            : p.addProduct"],
    [">المنتج</th>", ">{p.colProduct}</th>"],
    [">التصنيف</th>", ">{p.colCategory}</th>"],
    [">السعر</th>", ">{p.colPrice}</th>"],
    [">الحالة</th>", ">{p.colStatus}</th>"],
    [">إجراءات</th>", ">{p.colActions}</th>"],
    ["لا توجد منتجات", "{p.empty}"],
    [
      "`${formatPrice(dress.rental_price)} / إيجار`",
      "`${formatPrice(dress.rental_price)} ${p.rentalSuffix}`",
    ],
    ['aria-label="تعديل"', "aria-label={p.edit}"],
    ["جاري تحميل المنتجات…", "{p.loading}"],
  ];
  for (const [a, b] of reps) {
    if (!s.includes(a)) console.warn("dress miss", a.slice(0, 40));
    else s = s.split(a).join(b);
  }
  return s;
});

// ---- ShopProductsManager ----
patch("src/components/admin/ShopProductsManager.tsx", (s) => {
  if (!s.includes("useLocale")) {
    s = s.replace(
      '"use client";\n',
      '"use client";\n\nimport { useLocale } from "@/components/i18n/LocaleProvider";\nimport { formatMessage } from "@/lib/i18n";\n'
    );
  }
  if (!s.includes("productsUi")) {
    const m = s.match(/export function ShopProductsManager[^{]*\{/);
    if (m) {
      s = s.replace(m[0], m[0] + "\n  const { t } = useLocale();\n  const p = t.admin.productsUi;");
    }
  }
  const reps = [
    ['setError("الاسم مطلوب")', "setError(p.nameRequired)"],
    ['throw new Error(data.error ?? "فشل الحفظ")', "throw new Error(data.error ?? p.saveFailed)"],
    [
      ': "فشل حفظ المنتج. راجعي اتصال Supabase وجداول المتجر."',
      ": p.saveFailedHint",
    ],
    [
      "إدارة كاملة — إضافة، تعديل، أرشفة، نقل للسلة، بحث وتصفية",
      "{p.manageSubtitle}",
    ],
    [">إضافة جديد</", ">{p.addNew}</"],
    ['label="بحث"', "label={p.search}"],
    ['placeholder="الاسم، اللون، الخامة..."', "placeholder={p.searchPlaceholder}"],
    [">العرض</p>", ">{p.visibility}</p>"],
    ['label="التوفر"', "label={p.availability}"],
    ['{ value: "all", label: "الكل" }', '{ value: "all", label: p.all }'],
    ['{ value: "yes", label: "متوفر" }', '{ value: "yes", label: p.available }'],
    ['{ value: "no", label: "غير متوفر" }', '{ value: "no", label: p.unavailable }'],
    ["{filtered.length} منتج", "{formatMessage(p.productCount, { count: filtered.length })}"],
    [">المنتج</th>", ">{p.colProduct}</th>"],
    [">السعر</th>", ">{p.colPrice}</th>"],
    [">المخزون</th>", ">{p.colStock}</th>"],
    [">الحالة</th>", ">{p.colStatus}</th>"],
    [">إجراءات</th>", ">{p.colActions}</th>"],
    [
      '? "لا توجد منتجات بعد"\n                      : "لا توجد نتائج مطابقة للبحث أو التصفية"',
      "? p.emptyYet\n                      : p.emptyFiltered",
    ],
    ['{item.is_available ? "متوفر" : "غير متوفر"}', "{item.is_available ? p.available : p.unavailable}"],
    [">مميز</", ">{p.featured}</"],
    ["السابق", "{p.prev}"],
    ["التالي", "{p.next}"],
    [
      "صفحة {safePage} من {pageCount}",
      "{formatMessage(p.pageOf, { page: safePage, pages: pageCount })}",
    ],
    [
      "aria-label={editing ? \"تعديل المنتج\" : \"إضافة منتج\"}",
      "aria-label={editing ? p.editProduct : p.addProductTitle}",
    ],
    [
      "{editing ? \"تعديل المنتج\" : \"إضافة منتج\"}",
      "{editing ? p.editProduct : p.addProductTitle}",
    ],
    ['aria-label="إغلاق"', "aria-label={p.close}"],
    ['label="الاسم *"', "label={p.nameAr}"],
    ['label="الوصف"', "label={p.description}"],
    [
      'placeholder="وصف المنتج… Enter لسطر جديد (عربي / English) — بدون حد للطول"',
      "placeholder={p.descriptionPlaceholder}",
    ],
    [
      `وصف غير محدود الطول. يُحفظ التنسيق (الأسطر الجديدة) ويظهر كما هو
                  في صفحة المنتج.`,
      `{p.descriptionHint}`,
    ],
    ['label="السعر (₪) *"', "label={p.price}"],
    ['label="سعر التخفيض (₪)"', "label={p.salePrice}"],
    ['label="الكمية في المخزون"', "label={p.stock}"],
    ['label="التصنيف"', "label={p.category}"],
    ['label="المقاس"', "label={p.size}"],
    ['label="اللون"', "label={p.color}"],
    ['label="الخامة / Material"', "label={p.material}"],
    [">متوفر</", ">{p.available}</"],
    [">مميز</", ">{p.featured}</"],
    [">حفظ</", ">{p.save}</"],
    [">إلغاء</", ">{p.cancel}</"],
  ];
  for (const [a, b] of reps) {
    if (!s.includes(a)) console.warn("shop miss", a.slice(0, 45));
    else s = s.split(a).join(b);
  }
  return s;
});

// ---- CategoriesManager ----
patch("src/components/admin/CategoriesManager.tsx", (s) => {
  if (!s.includes("useLocale")) {
    s = s.replace(
      '"use client";\n',
      '"use client";\n\nimport { useLocale } from "@/components/i18n/LocaleProvider";\nimport { formatMessage } from "@/lib/i18n";\n'
    );
  }
  if (!s.includes("categoriesUi")) {
    s = s.replace(
      "export function CategoriesManager({ initialCategories }: CategoriesManagerProps) {\n  const router = useRouter();",
      "export function CategoriesManager({ initialCategories }: CategoriesManagerProps) {\n  const { t } = useLocale();\n  const c = t.admin.categoriesUi;\n  const router = useRouter();"
    );
  }
  const reps = [
    [
      'const opts = [{ value: "", label: "— بدون أب (تصنيف رئيسي) —" }];',
      'const opts = [{ value: "", label: c.noParent }];',
    ],
    ['setError("الاسم والمعرّف مطلوبان")', "setError(c.nameSlugRequired)"],
    ['throw new Error(data.error ?? "فشل الحفظ")', "throw new Error(data.error ?? c.saveFailed)"],
    ['setError(e instanceof Error ? e.message : "حدث خطأ")', "setError(e instanceof Error ? e.message : c.genericError)"],
    ['alert(data.error ?? "فشل تحديث الظهور")', "alert(data.error ?? c.visibilityFailed)"],
    [
      "if (!confirm(`نقل التصنيف «${item.name_ar}» إلى سلة المحذوفات؟`)) return;",
      "if (!confirm(formatMessage(c.deleteConfirm, { name: item.name_ar }))) return;",
    ],
    ['alert(data.error ?? "فشل الحذف")', "alert(data.error ?? c.deleteFailed)"],
    [': "رئيسي"}', ": c.root}"],
    ['{node.is_visible ? "ظاهر" : "مخفي"}', "{node.is_visible ? c.visible : c.hidden}"],
    ['aria-label="تعديل"', "aria-label={c.edit}"],
    ['aria-label="حذف"', "aria-label={c.delete}"],
    [">إضافة تصنيف</", ">{c.addCategory}</"],
    [">التصنيف</th>", ">{c.colCategory}</th>"],
    [">الأب</th>", ">{c.colParent}</th>"],
    [">الترتيب</th>", ">{c.colOrder}</th>"],
    [">الظهور</th>", ">{c.colVisibility}</th>"],
    [">الغلاف</th>", ">{c.colCover}</th>"],
    ["لا توجد تصنيفات بعد", "{c.empty}"],
    [
      "{editing ? \"تعديل التصنيف\" : \"تصنيف جديد\"}",
      "{editing ? c.editCategory : c.newCategory}",
    ],
    ['aria-label="إغلاق"', "aria-label={c.close}"],
    ['label="الاسم"', "label={c.nameAr}"],
    ['placeholder="مثال: طرحة العروس"', "placeholder={c.namePlaceholder}"],
    ['label="المعرّف (slug)"', "label={c.slug}"],
    ['label="التصنيف الأب"', "label={c.parent}"],
    ['label="ترتيب العرض"', "label={c.sortOrder}"],
    ['label="مسار الصفحة (اختياري)"', "label={c.href}"],
    ['label="نوع المنتج"', "label={c.productKind}"],
    ['{ value: "dress", label: "فساتين" }', '{ value: "dress", label: c.kindDress }'],
    ['{ value: "veil", label: "طرحة العروس" }', '{ value: "veil", label: c.kindVeil }'],
    ['{ value: "bridal_robe", label: "برنص العروس" }', '{ value: "bridal_robe", label: c.kindRobe }'],
    ['{ value: "accessories_group", label: "مجموعة اكسسوارات" }', '{ value: "accessories_group", label: c.kindAccessories }'],
    [">إعدادات العرض</p>", ">{c.displaySettings}</p>"],
    ["منشور (ظاهر في الموقع)", "{c.published}"],
    ["ظاهر في قائمة التنقل", "{c.inNav}"],
    ["ظاهر في الصفحة الرئيسية", "{c.onHomepage}"],
    ["مجموعة مميزة (تمييز في الرئيسية)", "{c.featuredCollection}"],
    ['label="الوصف"', "label={c.description}"],
    ['placeholder="وصف اختياري للتصنيف…"', "placeholder={c.descriptionPlaceholder}"],
    ['label="عنوان SEO (اختياري)"', "label={c.seoTitle}"],
    ['placeholder="يُستخدم في عنوان الصفحة إن وُجد"', "placeholder={c.seoTitlePlaceholder}"],
    ['label="وصف SEO (اختياري)"', "label={c.seoDescription}"],
    ['placeholder="وصف محركات البحث / Open Graph"', "placeholder={c.seoDescriptionPlaceholder}"],
    [">أيقونة مخصصة</p>", ">{c.customIcon}</p>"],
    [">صورة الغلاف</p>", ">{c.coverImage}</p>"],
    [">صورة Open Graph (اختياري)</p>", ">{c.ogImage}</p>"],
    ['{saving ? "جارٍ الحفظ…" : "حفظ"}', "{saving ? c.saving : c.save}"],
    [">إلغاء</", ">{c.cancel}</"],
  ];
  for (const [a, b] of reps) {
    if (!s.includes(a)) console.warn("cat miss", a.slice(0, 45));
    else s = s.split(a).join(b);
  }
  return s;
});

console.log("done");
