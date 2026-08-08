/**
 * Patch StoreSettingsPanel + priority admin managers to use dictionary keys.
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

// --- StoreSettingsPanel ---
patch("src/components/admin/StoreSettingsPanel.tsx", (s) => {
  if (!s.includes('from "@/lib/i18n"') || !s.includes("formatMessage")) {
    s = s.replace(
      'import type { Dictionary } from "@/lib/i18n";',
      'import { formatMessage, type Dictionary } from "@/lib/i18n";'
    );
  }
  // Ensure sf alias near the main component's useLocale
  if (!s.includes("const sf = t.admin.settingsFields")) {
    s = s.replace(
      /export function StoreSettingsPanel[\s\S]*?const \{ t \} = useLocale\(\);/,
      (m) => m + "\n  const sf = t.admin.settingsFields;"
    );
  }

  const reps = [
    ['description="اسم المتجر، الشعار، والعملة — تظهر فوراً في الهيدر والفوتر."', "description={sf.generalDesc}"],
    ['label="اسم المتجر *"', "label={sf.storeName}"],
    ['label="العملة"', "label={sf.currency}"],
    ['label="اللغة"', "label={sf.language}"],
    ['label="المنطقة الزمنية"', "label={sf.timezone}"],
    ['label="البريد التجاري"', "label={sf.businessEmail}"],
    ['label="هاتف العمل"', "label={sf.businessPhone}"],
    ['label="وصف المتجر (عربي)"', "label={sf.descriptionAr}"],
    ['label="العنوان (عربي)"', "label={sf.addressAr}"],
    ['label="ساعات العمل (عربي)"', "label={sf.workingHoursAr}"],
    [">الشعار</p>", ">{sf.logo}</p>"],
    ["أيقونة المتصفح (Favicon)", "{sf.favicon}"],
    [
      'description="فعّلي الطرق الظاهرة في الدفع. علّمي «قريباً» للطرق غير المتصلة بعد — تظهر للزبونة مع شارة قريباً دون كسر الدفع عند الاستلام."',
      "description={sf.paymentsDesc}",
    ],
    ['label="الاسم بالعربية"', "label={sf.nameAr}"],
    ['label="الاسم (EN)"', "label={sf.nameEn}"],
    ['label="الوصف بالعربية"', "label={sf.descriptionArShort}"],
    [
      `<span className="rounded-lg bg-amber-50 px-2 py-1 text-center text-xs text-amber-800">
                          قريباً
                        </span>`,
      `<span className="rounded-lg bg-amber-50 px-2 py-1 text-center text-xs text-amber-800">
                          {sf.comingSoon}
                        </span>`,
    ],
    ['label="ظاهر في المتجر"', "label={sf.visibleInStore}"],
    ['label="قريباً"', "label={sf.comingSoon}"],
    ['label="Configured (env)"', "label={sf.configuredEnv}"],
    ['hint="لا تخزّني أسراراً هنا — علّمي فقط أن الـ env جاهز"', "hint={sf.configuredEnvHint}"],
    [
      `<label className="text-xs text-muted">
                        ترتيب`,
      `<label className="text-xs text-muted">
                        {sf.sortOrder}`,
    ],
    [
      'description="يُزامن مع إعدادات الموقع الحالية دون كسر مناطق الشحن أو CMS."',
      "description={sf.shippingDesc}",
    ],
    ['label="تفعيل الشحن"', "label={sf.shippingEnabled}"],
    ['label="الاستلام من البوتيك"', "label={sf.boutiquePickup}"],
    ['label="التوصيل"', "label={sf.deliveryEnabled}"],
    [
      "label={`رسوم الشحن الثابتة (${formatPrice(settings.shipping.shipping_flat_fee)})`}",
      "label={formatMessage(sf.flatFee, { price: formatPrice(settings.shipping.shipping_flat_fee) })}",
    ],
    ['label="حد الشحن المجاني (0 = بدون)"', "label={sf.freeThreshold}"],
    ['label="تقدير التوصيل الافتراضي (عربي)"', "label={sf.estimatedDeliveryAr}"],
    ['placeholder="مثال: 3–5 أيام عمل"', "placeholder={sf.estimatedDeliveryPlaceholder}"],
    [
      `مناطق الشحن التفصيلية تُدار من{" "}
              <Link href="/admin/shipping" className="text-gold underline">
                إعدادات الشحن
              </Link>`,
      `{sf.shippingRegionsHint}{" "}
              <Link href="/admin/shipping" className="text-gold underline">
                {sf.shippingRegionsLink}
              </Link>`,
    ],
    [
      'description="الهاتف والواتساب والبريد تظهر فوراً في الفوتر وزر واتساب."',
      "description={sf.contactDesc}",
    ],
    ['label="الهاتف"', "label={sf.phone}"],
    ['label="واتساب (بدون +، مثال: 9725...)"', "label={sf.whatsapp}"],
    ['label="البريد"', "label={sf.email}"],
    ['label="إنستغرام"', "label={sf.instagram}"],
    ['label="فيسبوك"', "label={sf.facebook}"],
    ['label="تيك توك"', "label={sf.tiktok}"],
    ['label="الموقع / العنوان"', "label={sf.location}"],
    ['label="رابط Google Maps"', "label={sf.googleMaps}"],
    ['description="روابط الشبكات الاجتماعية للمتجر."', "description={sf.socialDesc}"],
    [
      `[
                  ["instagram_url", "إنستغرام"],
                  ["facebook_url", "فيسبوك"],
                  ["tiktok_url", "تيك توك"],
                  ["pinterest_url", "بينتريست"],
                  ["youtube_url", "يوتيوب"],
                ] as const`,
      `[
                  ["instagram_url", sf.instagram],
                  ["facebook_url", sf.facebook],
                  ["tiktok_url", sf.tiktok],
                  ["pinterest_url", sf.pinterest],
                  ["youtube_url", sf.youtube],
                ] as const`,
    ],
    [
      'description="تفعيل/إخفاء الأقسام دون تعديل الكود. محتوى الهيرو من قائمة المحتوى."',
      "description={sf.homepageDesc}",
    ],
    [
      `[
                  ["hero", "الهيرو"],
                  ["featured_categories", "التصنيفات المميزة"],
                  ["featured_products", "المنتجات المميزة"],
                  ["collections", "قسم التصميم الخاص"],
                  ["instagram", "إنستغرام"],
                ] as const`,
      `[
                  ["hero", sf.hero],
                  ["featured_categories", sf.featuredCategories],
                  ["featured_products", sf.featuredProducts],
                  ["collections", sf.collectionsSection],
                  ["instagram", sf.instagram],
                ] as const`,
    ],
    [
      `تحرير نصوص/صور الهيرو:{" "}
              <Link href="/admin/content/home" className="text-gold underline">
                محتوى الرئيسية
              </Link>`,
      `{sf.editHeroHint}{" "}
              <Link href="/admin/content/home" className="text-gold underline">
                {sf.homeContentLink}
              </Link>`,
    ],
    [
      `قنوات الدخول (بريد، زائرة، Google، Apple، واتساب…) — التفعيل،
                قريباً، والترتيب من قاعدة البيانات. احفظي من زر النموذج أدناه.`,
      `{sf.authDesc}`,
    ],
    [
      `[
                  ["guest_checkout_enabled", "الشراء كزائرة"],
                  ["google_enabled", "Google"],
                  ["apple_enabled", "Apple"],
                  ["email_password_enabled", "البريد وكلمة المرور"],
                  ["phone_otp_enabled", "واتساب OTP (نشط)"],
                  ["registration_enabled", "التسجيل"],
                ] as const`,
      `[
                  ["guest_checkout_enabled", sf.guestCheckout],
                  ["google_enabled", "Google"],
                  ["apple_enabled", "Apple"],
                  ["email_password_enabled", sf.emailPassword],
                  ["phone_otp_enabled", sf.whatsappOtp],
                  ["registration_enabled", sf.registration],
                ] as const`,
    ],
    ["حفظ المفاتيح السريعة", "{sf.saveQuickKeys}"],
    [
      'description="SMS مستقبلاً. قوالب الطلبات من صفحة الإشعارات."',
      "description={sf.notificationsDesc}",
    ],
    ['label="البريد"\n                checked={settings.notifications.email_enabled}', "label={sf.notifEmail}\n                checked={settings.notifications.email_enabled}"],
    ['label="واتساب"\n                checked={settings.notifications.whatsapp_enabled}', "label={sf.notifWhatsapp}\n                checked={settings.notifications.whatsapp_enabled}"],
    ['hint="قريباً"', "hint={sf.comingSoon}"],
    [
      `اتصال Resend وقوالب الرسائل:{" "}
              <Link href="/admin/notifications" className="text-gold underline">
                الإشعارات
              </Link>`,
      `{sf.resendTemplatesHint}{" "}
              <Link href="/admin/notifications" className="text-gold underline">
                {sf.notificationsLink}
              </Link>`,
    ],
    [
      'description="خيارات تُجمع من العميلة عند إتمام الطلب (تاريخ التوصيل، ملاحظات، …)."',
      "description={sf.orderOptionsDesc}",
    ],
    ['label="مفعّل"', "label={sf.enabled}"],
    ['label="إلزامي"', "label={sf.required}"],
    [
      'description="إنشاء الخدمات مرة واحدة: تسعير FREE/FIXED، إلزامي، محدد افتراضياً، ونطاق ظهور بالمعرّفات. تُزامَن مع جدول store_services."',
      "description={sf.extraServicesDesc}",
    ],
    [
      'description="العنوان والوصف وOG والـ robots تُطبَّق على المتجر. معرّفات التحليلات تُحفظ للمرحلة التالية (لا تُحقَن تلقائياً بعد)."',
      "description={sf.seoDesc}",
    ],
    ['label="عنوان الصفحة الافتراضي"', "label={sf.defaultPageTitle}"],
    ['label="الوصف"\n              value={settings.seo.description}', "label={sf.seoDescription}\n              value={settings.seo.description}"],
    ['label="الكلمات المفتاحية"', "label={sf.keywords}"],
    ["صورة Open Graph", "{sf.ogImage}"],
    [
      'description="وضع الصيانة وحالة النسخ الاحتياطي (عرض)."',
      "description={sf.securityDesc}",
    ],
    ['label="مهلة الجلسة (دقائق)"', "label={sf.sessionTimeout}"],
    ['label="وضع الصيانة (قريباً)"', "label={sf.maintenanceMode}"],
    [
      'hint="محفوظ في الإعدادات — صفحة الصيانة للمتجر غير مفعّلة بعد"',
      "hint={sf.maintenanceHint}",
    ],
    [">حالة النسخ الاحتياطي</p>", ">{sf.backupStatus}</p>"],
    [
      'description="حالة التكاملات فقط. الأسرار عبر متغيرات البيئة — ليست في قاعدة البيانات."',
      "description={sf.integrationsDesc}",
    ],
    [
      `<span className="rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800">
                        قريباً
                      </span>`,
      `<span className="rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800">
                        {sf.comingSoon}
                      </span>`,
    ],
    [
      'description="محتوى الشروط والخصوصية والإرجاع والشحن — يظهر في /legal/* والفوتر. النصوص الافتراضية نماذج إسرائيلية وليست استشارة قانونية."',
      "description={sf.legalDesc}",
    ],
    [
      `راجعي النصوص مع محامٍ مختص قبل الاعتماد عليها. يمكنكِ إخفاء شارة
              «نموذج» بعد المراجعة.`,
      `{sf.legalBannerHint}`,
    ],
    ['label="إظهار تنبيه «نموذج أولي» على الصفحات"', "label={sf.showTemplateBanner}"],
    [
      'label="طلب موافقة على الشروط والخصوصية عند الدفع"',
      "label={sf.requireCheckoutAcceptance}",
    ],
    [">معاينة الشروط</Link>", ">{sf.previewTerms}</Link>"],
    [
      `href="/legal/privacy"
                className="text-gold underline"
                target="_blank"
              >
                الخصوصية
              </Link>`,
      `href="/legal/privacy"
                className="text-gold underline"
                target="_blank"
              >
                {sf.previewPrivacy}
              </Link>`,
    ],
    [
      `href="/legal/returns"
                className="text-gold underline"
                target="_blank"
              >
                الإرجاع
              </Link>`,
      `href="/legal/returns"
                className="text-gold underline"
                target="_blank"
              >
                {sf.previewReturns}
              </Link>`,
    ],
    [
      `href="/legal/shipping"
                className="text-gold underline"
                target="_blank"
              >
                الشحن
              </Link>`,
      `href="/legal/shipping"
                className="text-gold underline"
                target="_blank"
              >
                {sf.previewShipping}
              </Link>`,
    ],
    [
      `href="/contact"
                className="text-gold underline"
                target="_blank"
              >
                اتصل بنا
              </Link>`,
      `href="/contact"
                className="text-gold underline"
                target="_blank"
              >
                {sf.previewContact}
              </Link>`,
    ],
    [
      `[
                ["terms_ar", "الشروط والأحكام (عربي)"],
                ["privacy_ar", "سياسة الخصوصية (عربي)"],
                ["returns_ar", "الإرجاع والاسترداد (عربي)"],
                ["shipping_policy_ar", "سياسة الشحن (عربي)"],
                ["terms_en", "Terms (English — اختياري)"],
                ["privacy_en", "Privacy (English — اختياري)"],
                ["returns_en", "Returns (English — اختياري)"],
                ["shipping_policy_en", "Shipping policy (English — اختياري)"],
              ] as const`,
      `[
                ["terms_ar", sf.termsAr],
                ["privacy_ar", sf.privacyAr],
                ["returns_ar", sf.returnsAr],
                ["shipping_policy_ar", sf.shippingPolicyAr],
                ["terms_en", sf.termsEn],
                ["privacy_en", sf.privacyEn],
                ["returns_en", sf.returnsEn],
                ["shipping_policy_en", sf.shippingPolicyEn],
              ] as const`,
    ],
    [
      'description="حقول العمل الإسرائيلي للمستندات الداخلية (חשבונית / קבלה). لا يوجد ربط بسلطة الضرائب أو Green Invoice بعد — جاهز لربط مزوّد لاحقًا من التكاملات."',
      "description={sf.taxDesc}",
    ],
    ['label="رقم العمل (ח.פ. / ע.מ.)"', "label={sf.businessId}"],
    ['label="نوع المعرّف"', "label={sf.businessIdType}"],
    ['{ value: "authorized_dealer", label: "ע.מ. / تاجر مرخّص" }', '{ value: "authorized_dealer", label: sf.idAuthorizedDealer }'],
    ['{ value: "company", label: "ח.פ. / شركة" }', '{ value: "company", label: sf.idCompany }'],
    ['{ value: "exempt", label: "עוסק פטור / معفى" }', '{ value: "exempt", label: sf.idExempt }'],
    ['{ value: "other", label: "أخرى" }', '{ value: "other", label: sf.idOther }'],
    [`label='نسبة ضريبة القيمة المضافة % (מע"מ)'`, "label={sf.vatRate}"],
    ['label="بادئة رقم المستند"', "label={sf.invoicePrefix}"],
    ['label="الرقم التسلسلي التالي"', "label={sf.nextInvoiceNumber}"],
    ['label="نوع المستند الافتراضي"', "label={sf.defaultDocumentType}"],
    ['label: "חשבונית מס / קבלה"', "label: sf.docTaxInvoiceReceipt"],
    ['label: "חשבונית מס"', "label: sf.docTaxInvoice"],
    ['label: "קבלה / إيصال"', "label: sf.docReceipt"],
    ['label="متى يُصدر المستند؟"', "label={sf.issueTrigger}"],
    ['{ value: "on_order", label: "عند إنشاء الطلب" }', '{ value: "on_order", label: sf.issueOnOrder }'],
    ['label: "عند تأكيد استلام الدفعة"', "label: sf.issueOnPayment"],
    ['{ value: "manual", label: "يدويًا من الإدارة فقط" }', '{ value: "manual", label: sf.issueManual }'],
    ['label="الأسعار تشمل ضريبة القيمة المضافة"', "label={sf.pricesIncludeVat}"],
    ['hint="الوضع الشائع لمتاجر B2C في إسرائيل"', "hint={sf.pricesIncludeVatHint}"],
    [
      `اسم المتجر، العنوان، والهاتف على الفاتورة تُؤخذ من قسمَي «عام»
              و«التواصل». مزوّد خارجي: قريبًا من تبويب التكاملات (Green Invoice /
              Morning).`,
      `{sf.taxFooterHint}`,
    ],
    [
      `فحص مباشر لقاعدة البيانات والتخزين والبريد والمدفوعات
                  والمصادقة والبيئة.`,
      `{sf.healthDesc}`,
    ],
    ["تحديث الفحص", "{sf.refreshHealth}"],
    [
      "الحالة العامة: {health.overall}",
      "{formatMessage(sf.overallStatus, { status: health.overall })}",
    ],
  ];

  for (const [a, b] of reps) {
    if (!s.includes(a)) {
      console.warn("MISS:", a.slice(0, 60).replace(/\n/g, "\\n"));
      continue;
    }
    s = s.split(a).join(b);
  }
  return s;
});

console.log("StoreSettingsPanel phase done");
