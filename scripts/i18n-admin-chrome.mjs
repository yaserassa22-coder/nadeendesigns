/**
 * Inject admin.settingsFields + related chrome dictionaries and patch StoreSettingsPanel.
 * Run: node scripts/i18n-admin-chrome.mjs
 */
import fs from "fs";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const typesPath = `${root}/src/lib/i18n/types.ts`;
const dictPath = `${root}/src/lib/i18n/dictionaries.ts`;

const settingsFieldsType = `    settingsFields: {
      generalDesc: string;
      storeName: string;
      currency: string;
      language: string;
      timezone: string;
      businessEmail: string;
      businessPhone: string;
      descriptionAr: string;
      addressAr: string;
      workingHoursAr: string;
      logo: string;
      favicon: string;
      paymentsDesc: string;
      nameAr: string;
      nameEn: string;
      descriptionArShort: string;
      comingSoon: string;
      visibleInStore: string;
      configuredEnv: string;
      configuredEnvHint: string;
      sortOrder: string;
      shippingDesc: string;
      shippingEnabled: string;
      boutiquePickup: string;
      deliveryEnabled: string;
      flatFee: string;
      freeThreshold: string;
      estimatedDeliveryAr: string;
      estimatedDeliveryPlaceholder: string;
      shippingRegionsHint: string;
      shippingRegionsLink: string;
      contactDesc: string;
      phone: string;
      whatsapp: string;
      email: string;
      instagram: string;
      facebook: string;
      tiktok: string;
      pinterest: string;
      youtube: string;
      location: string;
      googleMaps: string;
      socialDesc: string;
      homepageDesc: string;
      hero: string;
      featuredCategories: string;
      featuredProducts: string;
      collectionsSection: string;
      editHeroHint: string;
      homeContentLink: string;
      authDesc: string;
      guestCheckout: string;
      emailPassword: string;
      whatsappOtp: string;
      registration: string;
      saveQuickKeys: string;
      notificationsDesc: string;
      notifEmail: string;
      notifWhatsapp: string;
      resendTemplatesHint: string;
      notificationsLink: string;
      orderOptionsDesc: string;
      enabled: string;
      required: string;
      extraServicesDesc: string;
      seoDesc: string;
      defaultPageTitle: string;
      seoDescription: string;
      keywords: string;
      ogImage: string;
      securityDesc: string;
      sessionTimeout: string;
      maintenanceMode: string;
      maintenanceHint: string;
      backupStatus: string;
      integrationsDesc: string;
      legalDesc: string;
      legalBannerHint: string;
      showTemplateBanner: string;
      requireCheckoutAcceptance: string;
      previewTerms: string;
      previewPrivacy: string;
      previewReturns: string;
      previewShipping: string;
      previewContact: string;
      termsAr: string;
      privacyAr: string;
      returnsAr: string;
      shippingPolicyAr: string;
      termsEn: string;
      privacyEn: string;
      returnsEn: string;
      shippingPolicyEn: string;
      taxDesc: string;
      businessId: string;
      businessIdType: string;
      idAuthorizedDealer: string;
      idCompany: string;
      idExempt: string;
      idOther: string;
      vatRate: string;
      invoicePrefix: string;
      nextInvoiceNumber: string;
      defaultDocumentType: string;
      docTaxInvoiceReceipt: string;
      docTaxInvoice: string;
      docReceipt: string;
      issueTrigger: string;
      issueOnOrder: string;
      issueOnPayment: string;
      issueManual: string;
      pricesIncludeVat: string;
      pricesIncludeVatHint: string;
      taxFooterHint: string;
      healthDesc: string;
      refreshHealth: string;
      overallStatus: string;
    };
    authSettings: {
      title: string;
      description: string;
      labelAr: string;
      whatsappProvider: string;
      providerAuto: string;
      comingSoon: string;
      enabledVisible: string;
      configuredEnv: string;
      moveUp: string;
      moveDown: string;
      otpExpiry: string;
      maxAttempts: string;
      resendSeconds: string;
      envStatus: string;
      whatsappOtp: string;
      whatsappProviderEnv: string;
      resendRecovery: string;
      fromNotifications: string;
      footerHint: string;
      save: string;
      saveOk: string;
      saveFailed: string;
      failed: string;
    };
    sidebarUi: {
      noVisibleCategories: string;
      rentalFallback: string;
      addRentalChild: string;
      accessoriesFallback: string;
    };
    bookingsUi: {
      filterStatus: string;
      serviceType: string;
      visibility: string;
      all: string;
      addManual: string;
      calendar: string;
      refresh: string;
      exportCsv: string;
      colCustomer: string;
      colAppointment: string;
      colService: string;
      colSource: string;
      colStatus: string;
      colActions: string;
      loading: string;
      empty: string;
      details: string;
      changeStatusAria: string;
      personalizationWriting: string;
      giftWrap: string;
      lastReply: string;
      createdAt: string;
      movedToTrash: string;
      archived: string;
      unarchived: string;
      updateFailed: string;
      genericError: string;
      loadFailed: string;
      invalidResponse: string;
    };
    messagesUi: {
      title: string;
      subtitle: string;
      refresh: string;
      exportCsv: string;
      search: string;
      searchPlaceholder: string;
      visibility: string;
      empty: string;
      fromAccount: string;
      contact: string;
      unread: string;
      read: string;
      replied: string;
      localReply: string;
      replyFailed: string;
      lastReply: string;
      reply: string;
      copyEmail: string;
      copyPhone: string;
      openMailto: string;
      markRead: string;
      markUnread: string;
      close: string;
      loadFailed: string;
      invalidResponse: string;
      sendFailed: string;
      networkError: string;
      copyFailed: string;
      movedToTrash: string;
      copied: string;
    };
    customersUi: {
      title: string;
      searchPlaceholder: string;
      empty: string;
      refresh: string;
      loadFailed: string;
    };
    reportsUi: {
      title: string;
      subtitle: string;
      noData: string;
      loadFailed: string;
      filters: string;
      period: string;
      from: string;
      to: string;
      category: string;
      product: string;
      shippingRegion: string;
      deliveryMethod: string;
      orderStatus: string;
      bookingStatus: string;
      all: string;
      delivery: string;
      pickup: string;
      customer: string;
      apply: string;
      updating: string;
      print: string;
    };
    notificationsAdmin: {
      title: string;
      save: string;
      saved: string;
      saveFailed: string;
    };
    emailProvider: {
      title: string;
      save: string;
      test: string;
      saved: string;
      saveFailed: string;
    };`;

const arSettings = `    settingsFields: {
      generalDesc: "اسم المتجر، الشعار، والعملة — تظهر فوراً في الهيدر والفوتر.",
      storeName: "اسم المتجر *",
      currency: "العملة",
      language: "اللغة",
      timezone: "المنطقة الزمنية",
      businessEmail: "البريد التجاري",
      businessPhone: "هاتف العمل",
      descriptionAr: "وصف المتجر (عربي)",
      addressAr: "العنوان (عربي)",
      workingHoursAr: "ساعات العمل (عربي)",
      logo: "الشعار",
      favicon: "أيقونة المتصفح (Favicon)",
      paymentsDesc: "فعّلي الطرق الظاهرة في الدفع. علّمي «قريباً» للطرق غير المتصلة بعد — تظهر للزبونة مع شارة قريباً دون كسر الدفع عند الاستلام.",
      nameAr: "الاسم بالعربية",
      nameEn: "الاسم (EN)",
      descriptionArShort: "الوصف بالعربية",
      comingSoon: "قريباً",
      visibleInStore: "ظاهر في المتجر",
      configuredEnv: "Configured (env)",
      configuredEnvHint: "لا تخزّني أسراراً هنا — علّمي فقط أن الـ env جاهز",
      sortOrder: "ترتيب",
      shippingDesc: "يُزامن مع إعدادات الموقع الحالية دون كسر مناطق الشحن أو CMS.",
      shippingEnabled: "تفعيل الشحن",
      boutiquePickup: "الاستلام من البوتيك",
      deliveryEnabled: "التوصيل",
      flatFee: "رسوم الشحن الثابتة ({price})",
      freeThreshold: "حد الشحن المجاني (0 = بدون)",
      estimatedDeliveryAr: "تقدير التوصيل الافتراضي (عربي)",
      estimatedDeliveryPlaceholder: "مثال: 3–5 أيام عمل",
      shippingRegionsHint: "مناطق الشحن التفصيلية تُدار من",
      shippingRegionsLink: "إعدادات الشحن",
      contactDesc: "الهاتف والواتساب والبريد تظهر فوراً في الفوتر وزر واتساب.",
      phone: "الهاتف",
      whatsapp: "واتساب (بدون +، مثال: 9725...)",
      email: "البريد",
      instagram: "إنستغرام",
      facebook: "فيسبوك",
      tiktok: "تيك توك",
      pinterest: "بينتريست",
      youtube: "يوتيوب",
      location: "الموقع / العنوان",
      googleMaps: "رابط Google Maps",
      socialDesc: "روابط الشبكات الاجتماعية للمتجر.",
      homepageDesc: "تفعيل/إخفاء الأقسام دون تعديل الكود. محتوى الهيرو من قائمة المحتوى.",
      hero: "الهيرو",
      featuredCategories: "التصنيفات المميزة",
      featuredProducts: "المنتجات المميزة",
      collectionsSection: "قسم التصميم الخاص",
      editHeroHint: "تحرير نصوص/صور الهيرو:",
      homeContentLink: "محتوى الرئيسية",
      authDesc: "قنوات الدخول (بريد، زائرة، Google، Apple، واتساب…) — التفعيل، قريباً، والترتيب من قاعدة البيانات. احفظي من زر النموذج أدناه.",
      guestCheckout: "الشراء كزائرة",
      emailPassword: "البريد وكلمة المرور",
      whatsappOtp: "واتساب OTP (نشط)",
      registration: "التسجيل",
      saveQuickKeys: "حفظ المفاتيح السريعة",
      notificationsDesc: "SMS مستقبلاً. قوالب الطلبات من صفحة الإشعارات.",
      notifEmail: "البريد",
      notifWhatsapp: "واتساب",
      resendTemplatesHint: "اتصال Resend وقوالب الرسائل:",
      notificationsLink: "الإشعارات",
      orderOptionsDesc: "خيارات تُجمع من العميلة عند إتمام الطلب (تاريخ التوصيل، ملاحظات، …).",
      enabled: "مفعّل",
      required: "إلزامي",
      extraServicesDesc: "إنشاء الخدمات مرة واحدة: تسعير FREE/FIXED، إلزامي، محدد افتراضياً، ونطاق ظهور بالمعرّفات. تُزامَن مع جدول store_services.",
      seoDesc: "العنوان والوصف وOG والـ robots تُطبَّق على المتجر. معرّفات التحليلات تُحفظ للمرحلة التالية (لا تُحقَن تلقائياً بعد).",
      defaultPageTitle: "عنوان الصفحة الافتراضي",
      seoDescription: "الوصف",
      keywords: "الكلمات المفتاحية",
      ogImage: "صورة Open Graph",
      securityDesc: "وضع الصيانة وحالة النسخ الاحتياطي (عرض).",
      sessionTimeout: "مهلة الجلسة (دقائق)",
      maintenanceMode: "وضع الصيانة (قريباً)",
      maintenanceHint: "محفوظ في الإعدادات — صفحة الصيانة للمتجر غير مفعّلة بعد",
      backupStatus: "حالة النسخ الاحتياطي",
      integrationsDesc: "حالة التكاملات فقط. الأسرار عبر متغيرات البيئة — ليست في قاعدة البيانات.",
      legalDesc: "محتوى الشروط والخصوصية والإرجاع والشحن — يظهر في /legal/* والفوتر. النصوص الافتراضية نماذج إسرائيلية وليست استشارة قانونية.",
      legalBannerHint: "راجعي النصوص مع محامٍ مختص قبل الاعتماد عليها. يمكنكِ إخفاء شارة «نموذج» بعد المراجعة.",
      showTemplateBanner: "إظهار تنبيه «نموذج أولي» على الصفحات",
      requireCheckoutAcceptance: "طلب موافقة على الشروط والخصوصية عند الدفع",
      previewTerms: "معاينة الشروط",
      previewPrivacy: "الخصوصية",
      previewReturns: "الإرجاع",
      previewShipping: "الشحن",
      previewContact: "اتصل بنا",
      termsAr: "الشروط والأحكام (عربي)",
      privacyAr: "سياسة الخصوصية (عربي)",
      returnsAr: "الإرجاع والاسترداد (عربي)",
      shippingPolicyAr: "سياسة الشحن (عربي)",
      termsEn: "Terms (English — اختياري)",
      privacyEn: "Privacy (English — اختياري)",
      returnsEn: "Returns (English — اختياري)",
      shippingPolicyEn: "Shipping policy (English — اختياري)",
      taxDesc: "حقول العمل الإسرائيلي للمستندات الداخلية (חשבונית / קבלה). لا يوجد ربط بسلطة الضرائب أو Green Invoice بعد — جاهز لربط مزوّد لاحقًا من التكاملات.",
      businessId: "رقم العمل (ח.פ. / ע.מ.)",
      businessIdType: "نوع المعرّف",
      idAuthorizedDealer: "ע.מ. / تاجر مرخّص",
      idCompany: "ח.פ. / شركة",
      idExempt: "עוסק פטור / معفى",
      idOther: "أخرى",
      vatRate: "نسبة ضريبة القيمة المضافة % (מע\\"מ)",
      invoicePrefix: "بادئة رقم المستند",
      nextInvoiceNumber: "الرقم التسلسلي التالي",
      defaultDocumentType: "نوع المستند الافتراضي",
      docTaxInvoiceReceipt: "חשבונית מס / קבלה",
      docTaxInvoice: "חשבונית מס",
      docReceipt: "קבלה / إيصال",
      issueTrigger: "متى يُصدر المستند؟",
      issueOnOrder: "عند إنشاء الطلب",
      issueOnPayment: "عند تأكيد استلام الدفعة",
      issueManual: "يدويًا من الإدارة فقط",
      pricesIncludeVat: "الأسعار تشمل ضريبة القيمة المضافة",
      pricesIncludeVatHint: "الوضع الشائع لمتاجر B2C في إسرائيل",
      taxFooterHint: "اسم المتجر، العنوان، والهاتف على الفاتورة تُؤخذ من قسمَي «عام» و«التواصل». مزوّد خارجي: قريبًا من تبويب التكاملات (Green Invoice / Morning).",
      healthDesc: "فحص مباشر لقاعدة البيانات والتخزين والبريد والمدفوعات والمصادقة والبيئة.",
      refreshHealth: "تحديث الفحص",
      overallStatus: "الحالة العامة: {status}",
    },
    authSettings: {
      title: "مصادقة العملاء",
      description: "تحكّمي بظهور وترتيب قنوات الدخول وشارة «قريباً» دون تعديل الكود. الأسرار تبقى في البيئة (مثل Resend) — هنا التفعيل والإعداد فقط.",
      labelAr: "التسمية بالعربية",
      whatsappProvider: "مزوّد واتساب (غير سرّي)",
      providerAuto: "تلقائي (auto)",
      comingSoon: "قريباً",
      enabledVisible: "مفعّل / ظاهر",
      configuredEnv: "مُعدّ (env جاهز)",
      moveUp: "أعلى",
      moveDown: "أسفل",
      otpExpiry: "انتهاء OTP (ثانية)",
      maxAttempts: "أقصى محاولات",
      resendSeconds: "إعادة إرسال (ثانية)",
      envStatus: "حالة البيئة (أسرار):",
      whatsappOtp: "واتساب OTP:",
      whatsappProviderEnv: "مزوّد واتساب env:",
      resendRecovery: "Resend / بريد الاستعادة:",
      fromNotifications: "من الإشعارات",
      footerHint: "عند شراء واتساب للأعمال: اختاري المزوّد أعلاه، أزيلي «قريباً»، فعّلي القناة، وأضيفي المفاتيح في البيئة (نفس نمط Resend — لا حاجة لتعديل الكود لإظهار الزر). قوالب الإشعارات من صفحة الإشعارات.",
      save: "حفظ قنوات المصادقة",
      saveOk: "تم حفظ قنوات مصادقة العملاء",
      saveFailed: "فشل الحفظ",
      failed: "فشل",
    },
    sidebarUi: {
      noVisibleCategories: "لا توجد تصنيفات ظاهرة",
      rentalFallback: "فساتين الإيجار",
      addRentalChild: "أضيفي تصنيفاً فرعياً تحت فساتين الإيجار",
      accessoriesFallback: "إكسسوارات العروس",
    },
    bookingsUi: {
      filterStatus: "تصفية حسب الحالة",
      serviceType: "نوع الخدمة",
      visibility: "العرض",
      all: "الكل",
      addManual: "إضافة حجز يدوي",
      calendar: "التقويم",
      refresh: "تحديث",
      exportCsv: "تصدير CSV",
      colCustomer: "العميلة",
      colAppointment: "الموعد",
      colService: "الخدمة",
      colSource: "المصدر",
      colStatus: "الحالة",
      colActions: "إجراءات",
      loading: "جاري التحميل...",
      empty: "لا توجد حجوزات",
      details: "تفاصيل",
      changeStatusAria: "تغيير الحالة",
      personalizationWriting: "تخصيص كتابة",
      giftWrap: "🎁 تغليف هدية",
      lastReply: "آخر رد:",
      createdAt: "أُنشئ:",
      movedToTrash: "تم نقل الحجز إلى سلة المحذوفات",
      archived: "تمت الأرشفة",
      unarchived: "تم إلغاء الأرشفة",
      updateFailed: "فشل التحديث",
      genericError: "حدث خطأ",
      loadFailed: "فشل جلب الحجوزات",
      invalidResponse: "استجابة غير صالحة من واجهة الحجوزات",
    },
    messagesUi: {
      title: "الرسائل",
      subtitle: "رسائل نموذج التواصل + رسائل حساب العميلة — الرد يصل للحساب والبريد",
      refresh: "تحديث",
      exportCsv: "تصدير CSV",
      search: "بحث",
      searchPlaceholder: "الاسم، البريد، الهاتف، الموضوع...",
      visibility: "العرض",
      empty: "لا توجد رسائل",
      fromAccount: "من الحساب",
      contact: "تواصل",
      unread: "جديدة",
      read: "مقروءة",
      replied: "تم الرد",
      localReply: "رد محلي",
      replyFailed: "فشل الرد",
      lastReply: "آخر رد:",
      reply: "رد",
      copyEmail: "نسخ البريد",
      copyPhone: "نسخ الهاتف",
      openMailto: "فتح mailto",
      markRead: "تعليم كمقروءة",
      markUnread: "تعليم كغير مقروءة",
      close: "إغلاق",
      loadFailed: "تعذّر تحميل الرسائل",
      invalidResponse: "استجابة غير صالحة من الخادم",
      sendFailed: "تعذّر إرسال الرد",
      networkError: "تعذّر الاتصال بالخادم. تحققي من الشبكة.",
      copyFailed: "تعذّر النسخ",
      movedToTrash: "تم نقل الرسالة إلى سلة المحذوفات",
      copied: "تم نسخ {label}",
    },
    customersUi: {
      title: "العملاء",
      searchPlaceholder: "بحث بالاسم أو الهاتف أو البريد…",
      empty: "لا يوجد عملاء",
      refresh: "تحديث",
      loadFailed: "تعذّر تحميل العملاء",
    },
    reportsUi: {
      title: "مركز التقارير",
      subtitle: "تحليلات للقراءة فقط · الفترة:",
      noData: "لا توجد بيانات",
      loadFailed: "تعذر تحميل التقارير",
      filters: "الفلاتر",
      period: "الفترة",
      from: "من",
      to: "إلى",
      category: "التصنيف",
      product: "المنتج",
      shippingRegion: "منطقة الشحن",
      deliveryMethod: "طريقة الاستلام",
      orderStatus: "حالة الطلب",
      bookingStatus: "حالة الحجز",
      all: "الكل",
      delivery: "توصيل",
      pickup: "استلام من البوتيك",
      customer: "عميل (اسم / جوال / بريد)",
      apply: "تطبيق",
      updating: "جاري التحديث...",
      print: "طباعة",
    },
    notificationsAdmin: {
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
    },`;

const heSettings = `    settingsFields: {
      generalDesc: "שם החנות, הלוגו והמטבע — מופיעים מיד בכותרת ובתחתית.",
      storeName: "שם החנות *",
      currency: "מטבע",
      language: "שפה",
      timezone: "אזור זמן",
      businessEmail: "אימייל עסקי",
      businessPhone: "טלפון עסקי",
      descriptionAr: "תיאור החנות (ערבית)",
      addressAr: "כתובת (ערבית)",
      workingHoursAr: "שעות פעילות (ערבית)",
      logo: "לוגו",
      favicon: "סמל דפדפן (Favicon)",
      paymentsDesc: "הפעילו אמצעי תשלום בחנות. סמנו «בקרוב» לאמצעים שעדיין לא מחוברים — יופיע ללקוחה ללא שבירת תשלום במזומן.",
      nameAr: "שם בעברית/ערבית",
      nameEn: "שם (EN)",
      descriptionArShort: "תיאור בערבית",
      comingSoon: "בקרוב",
      visibleInStore: "גלוי בחנות",
      configuredEnv: "Configured (env)",
      configuredEnvHint: "אל תשמרו סודות כאן — סמנו רק שה-env מוכן",
      sortOrder: "סדר",
      shippingDesc: "מסונכרן עם הגדרות האתר ללא שבירת אזורי משלוח או CMS.",
      shippingEnabled: "הפעלת משלוח",
      boutiquePickup: "איסוף מהבוטיק",
      deliveryEnabled: "משלוח",
      flatFee: "דמי משלוח קבועים ({price})",
      freeThreshold: "סף משלוח חינם (0 = ללא)",
      estimatedDeliveryAr: "הערכת משלוח ברירת מחדל (ערבית)",
      estimatedDeliveryPlaceholder: "לדוגמה: 3–5 ימי עסקים",
      shippingRegionsHint: "אזורי משלוח מפורטים מנוהלים מ-",
      shippingRegionsLink: "הגדרות משלוח",
      contactDesc: "טלפון, וואטסאפ ואימייל מופיעים מיד בתחתית ובכפתור וואטסאפ.",
      phone: "טלפון",
      whatsapp: "וואטסאפ (ללא +, לדוגמה: 9725...)",
      email: "אימייל",
      instagram: "אינסטגרם",
      facebook: "פייסבוק",
      tiktok: "טיקטוק",
      pinterest: "פינטרסט",
      youtube: "יוטיוב",
      location: "מיקום / כתובת",
      googleMaps: "קישור Google Maps",
      socialDesc: "קישורי רשתות חברתיות לחנות.",
      homepageDesc: "הצגה/הסתרה של מדורים ללא שינוי קוד. תוכן ההירו מרשימת התוכן.",
      hero: "הירו",
      featuredCategories: "קטגוריות מובחרות",
      featuredProducts: "מוצרים מובחרים",
      collectionsSection: "מדור עיצוב מותאם",
      editHeroHint: "עריכת טקסטים/תמונות הירו:",
      homeContentLink: "תוכן דף הבית",
      authDesc: "ערוצי כניסה (אימייל, אורחת, Google, Apple, וואטסאפ…) — הפעלה, בקרוב וסדר ממסד הנתונים. שמרו מכפתור הטופס למטה.",
      guestCheckout: "רכישה כאורחת",
      emailPassword: "אימייל וסיסמה",
      whatsappOtp: "וואטסאפ OTP (פעיל)",
      registration: "הרשמה",
      saveQuickKeys: "שמירת מפתחות מהירים",
      notificationsDesc: "SMS בעתיד. תבניות הזמנות מדף ההתראות.",
      notifEmail: "אימייל",
      notifWhatsapp: "וואטסאפ",
      resendTemplatesHint: "חיבור Resend ותבניות הודעות:",
      notificationsLink: "התראות",
      orderOptionsDesc: "אפשרויות שנאספות מהלקוחה בסיום הזמנה (תאריך משלוח, הערות…).",
      enabled: "מופעל",
      required: "חובה",
      extraServicesDesc: "יצירת שירותים פעם אחת: תמחור FREE/FIXED, חובה, ברירת מחדל, והיקף תצוגה לפי מזהים. מסונכרן עם store_services.",
      seoDesc: "כותרת, תיאור, OG ו-robots מוחלים על החנות. מזהי אנליטיקה נשמרים לשלב הבא.",
      defaultPageTitle: "כותרת עמוד ברירת מחדל",
      seoDescription: "תיאור",
      keywords: "מילות מפתח",
      ogImage: "תמונת Open Graph",
      securityDesc: "מצב תחזוקה וסטטוס גיבוי (תצוגה).",
      sessionTimeout: "זמן פקיעת סשן (דקות)",
      maintenanceMode: "מצב תחזוקה (בקרוב)",
      maintenanceHint: "נשמר בהגדרות — עמוד תחזוקה לחנות עדיין לא מופעל",
      backupStatus: "סטטוס גיבוי",
      integrationsDesc: "סטטוס אינטגרציות בלבד. סודות דרך משתני סביבה — לא במסד הנתונים.",
      legalDesc: "תוכן תנאים, פרטיות, החזרות ומשלוח — מופיע ב-/legal/* ובתחתית. טקסטים ברירת מחדל הם תבניות ואינם ייעוץ משפטי.",
      legalBannerHint: "בדקו את הטקסטים עם עורך דין לפני הסתמכות. ניתן להסתיר תג «תבנית» אחרי הבדיקה.",
      showTemplateBanner: "הצגת התראת «טיוטה» בעמודים",
      requireCheckoutAcceptance: "דרישת הסכמה לתנאים ולפרטיות בתשלום",
      previewTerms: "תצוגת תנאים",
      previewPrivacy: "פרטיות",
      previewReturns: "החזרות",
      previewShipping: "משלוח",
      previewContact: "צור קשר",
      termsAr: "תנאים והתניות (ערבית)",
      privacyAr: "מדיניות פרטיות (ערבית)",
      returnsAr: "החזרות והחזר כספי (ערבית)",
      shippingPolicyAr: "מדיניות משלוח (ערבית)",
      termsEn: "Terms (English — אופציונלי)",
      privacyEn: "Privacy (English — אופציונלי)",
      returnsEn: "Returns (English — אופציונלי)",
      shippingPolicyEn: "Shipping policy (English — אופציונלי)",
      taxDesc: "שדות עסק ישראליים למסמכים פנימיים (חשבונית / קבלה). אין חיבור לרשות המסים או Green Invoice עדיין.",
      businessId: "מספר עוסק (ח.פ. / ע.מ.)",
      businessIdType: "סוג מזהה",
      idAuthorizedDealer: "ע.מ. / עוסק מורשה",
      idCompany: "ח.פ. / חברה",
      idExempt: "עוסק פטור",
      idOther: "אחר",
      vatRate: "שיעור מע\\"מ %",
      invoicePrefix: "קידומת מספר מסמך",
      nextInvoiceNumber: "המספר הסידורי הבא",
      defaultDocumentType: "סוג מסמך ברירת מחדל",
      docTaxInvoiceReceipt: "חשבונית מס / קבלה",
      docTaxInvoice: "חשבונית מס",
      docReceipt: "קבלה",
      issueTrigger: "מתי להנפיק את המסמך?",
      issueOnOrder: "ביצירת הזמנה",
      issueOnPayment: "באישור קבלת תשלום",
      issueManual: "ידנית מהניהול בלבד",
      pricesIncludeVat: "המחירים כוללים מע\\"מ",
      pricesIncludeVatHint: "המצב הנפוץ לחנויות B2C בישראל",
      taxFooterHint: "שם החנות, כתובת וטלפון בחשבונית נלקחים מהמדורים «כללי» ו«יצירת קשר». ספק חיצוני: בקרוב מאינטגרציות.",
      healthDesc: "בדיקה חיה של מסד נתונים, אחסון, אימייל, תשלומים, אימות וסביבה.",
      refreshHealth: "רענון בדיקה",
      overallStatus: "סטטוס כללי: {status}",
    },
    authSettings: {
      title: "אימות לקוחות",
      description: "ניהול הופעה וסדר ערוצי כניסה ותג «בקרוב» ללא שינוי קוד. סודות נשארים בסביבה.",
      labelAr: "תווית בערבית",
      whatsappProvider: "ספק וואטסאפ (לא סודי)",
      providerAuto: "אוטומטי (auto)",
      comingSoon: "בקרוב",
      enabledVisible: "מופעל / גלוי",
      configuredEnv: "מוגדר (env מוכן)",
      moveUp: "למעלה",
      moveDown: "למטה",
      otpExpiry: "פקיעת OTP (שניות)",
      maxAttempts: "מקסימום ניסיונות",
      resendSeconds: "שליחה מחדש (שניות)",
      envStatus: "סטטוס סביבה (סודות):",
      whatsappOtp: "וואטסאפ OTP:",
      whatsappProviderEnv: "ספק וואטסאפ env:",
      resendRecovery: "Resend / אימייל שחזור:",
      fromNotifications: "מההתראות",
      footerHint: "ברכישת וואטסאפ עסקי: בחרו ספק, הסירו «בקרוב», הפעילו ערוץ והוסיפו מפתחות בסביבה. תבניות התראות מדף ההתראות.",
      save: "שמירת ערוצי אימות",
      saveOk: "ערוצי אימות הלקוחות נשמרו",
      saveFailed: "השמירה נכשלה",
      failed: "נכשל",
    },
    sidebarUi: {
      noVisibleCategories: "אין קטגוריות גלויות",
      rentalFallback: "שמלות להשכרה",
      addRentalChild: "הוסיפי קטגוריית משנה תחת שמלות להשכרה",
      accessoriesFallback: "אקססוריז לכלות",
    },
    bookingsUi: {
      filterStatus: "סינון לפי סטטוס",
      serviceType: "סוג שירות",
      visibility: "תצוגה",
      all: "הכל",
      addManual: "הוספת תור ידני",
      calendar: "יומן",
      refresh: "רענון",
      exportCsv: "ייצוא CSV",
      colCustomer: "לקוחה",
      colAppointment: "תור",
      colService: "שירות",
      colSource: "מקור",
      colStatus: "סטטוס",
      colActions: "פעולות",
      loading: "טוען...",
      empty: "אין תורים",
      details: "פרטים",
      changeStatusAria: "שינוי סטטוס",
      personalizationWriting: "התאמה אישית",
      giftWrap: "🎁 עטיפת מתנה",
      lastReply: "תשובה אחרונה:",
      createdAt: "נוצר:",
      movedToTrash: "התור הועבר לפח",
      archived: "אורכב",
      unarchived: "בוטלה הארכוב",
      updateFailed: "העדכון נכשל",
      genericError: "אירעה שגיאה",
      loadFailed: "טעינת התורים נכשלה",
      invalidResponse: "תגובה לא תקינה מממשק התורים",
    },
    messagesUi: {
      title: "הודעות",
      subtitle: "הודעות טופס יצירת קשר + הודעות חשבון לקוחה — התשובה מגיעה לחשבון ולאימייל",
      refresh: "רענון",
      exportCsv: "ייצוא CSV",
      search: "חיפוש",
      searchPlaceholder: "שם, אימייל, טלפון, נושא...",
      visibility: "תצוגה",
      empty: "אין הודעות",
      fromAccount: "מהחשבון",
      contact: "יצירת קשר",
      unread: "חדשה",
      read: "נקראה",
      replied: "נענתה",
      localReply: "תשובה מקומית",
      replyFailed: "התשובה נכשלה",
      lastReply: "תשובה אחרונה:",
      reply: "תשובה",
      copyEmail: "העתק אימייל",
      copyPhone: "העתק טלפון",
      openMailto: "פתיחת mailto",
      markRead: "סמן כנקרא",
      markUnread: "סמן כלא נקרא",
      close: "סגור",
      loadFailed: "טעינת ההודעות נכשלה",
      invalidResponse: "תגובה לא תקינה מהשרת",
      sendFailed: "שליחת התשובה נכשלה",
      networkError: "אין חיבור לשרת. בדקי את הרשת.",
      copyFailed: "ההעתקה נכשלה",
      movedToTrash: "ההודעה הועברה לפח",
      copied: "הועתק {label}",
    },
    customersUi: {
      title: "לקוחות",
      searchPlaceholder: "חיפוש לפי שם, טלפון או אימייל…",
      empty: "אין לקוחות",
      refresh: "רענון",
      loadFailed: "טעינת הלקוחות נכשלה",
    },
    reportsUi: {
      title: "מרכז דוחות",
      subtitle: "אנליטיקה לקריאה בלבד · תקופה:",
      noData: "אין נתונים",
      loadFailed: "טעינת הדוחות נכשלה",
      filters: "מסננים",
      period: "תקופה",
      from: "מ-",
      to: "עד",
      category: "קטגוריה",
      product: "מוצר",
      shippingRegion: "אזור משלוח",
      deliveryMethod: "שיטת קבלה",
      orderStatus: "סטטוס הזמנה",
      bookingStatus: "סטטוס תור",
      all: "הכל",
      delivery: "משלוח",
      pickup: "איסוף מהבוטיק",
      customer: "לקוח (שם / נייד / אימייל)",
      apply: "החל",
      updating: "מעדכן...",
      print: "הדפסה",
    },
    notificationsAdmin: {
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
    },`;

const enSettings = `    settingsFields: {
      generalDesc: "Store name, logo, and currency — shown immediately in the header and footer.",
      storeName: "Store name *",
      currency: "Currency",
      language: "Language",
      timezone: "Timezone",
      businessEmail: "Business email",
      businessPhone: "Business phone",
      descriptionAr: "Store description (Arabic)",
      addressAr: "Address (Arabic)",
      workingHoursAr: "Working hours (Arabic)",
      logo: "Logo",
      favicon: "Browser icon (Favicon)",
      paymentsDesc: "Enable methods shown at checkout. Mark «Coming soon» for methods not connected yet — shown to customers without breaking cash on delivery.",
      nameAr: "Name (Arabic)",
      nameEn: "Name (EN)",
      descriptionArShort: "Description (Arabic)",
      comingSoon: "Coming soon",
      visibleInStore: "Visible in store",
      configuredEnv: "Configured (env)",
      configuredEnvHint: "Do not store secrets here — only mark that env is ready",
      sortOrder: "Sort order",
      shippingDesc: "Synced with current site settings without breaking shipping regions or CMS.",
      shippingEnabled: "Enable shipping",
      boutiquePickup: "Boutique pickup",
      deliveryEnabled: "Delivery",
      flatFee: "Flat shipping fee ({price})",
      freeThreshold: "Free shipping threshold (0 = none)",
      estimatedDeliveryAr: "Default delivery estimate (Arabic)",
      estimatedDeliveryPlaceholder: "e.g. 3–5 business days",
      shippingRegionsHint: "Detailed shipping regions are managed from",
      shippingRegionsLink: "Shipping settings",
      contactDesc: "Phone, WhatsApp, and email appear immediately in the footer and WhatsApp button.",
      phone: "Phone",
      whatsapp: "WhatsApp (no +, e.g. 9725...)",
      email: "Email",
      instagram: "Instagram",
      facebook: "Facebook",
      tiktok: "TikTok",
      pinterest: "Pinterest",
      youtube: "YouTube",
      location: "Location / address",
      googleMaps: "Google Maps URL",
      socialDesc: "Store social media links.",
      homepageDesc: "Show/hide sections without code changes. Hero content is managed from the content list.",
      hero: "Hero",
      featuredCategories: "Featured categories",
      featuredProducts: "Featured products",
      collectionsSection: "Custom design section",
      editHeroHint: "Edit hero text/images:",
      homeContentLink: "Homepage content",
      authDesc: "Login channels (email, guest, Google, Apple, WhatsApp…) — enable, coming soon, and order from the database. Save with the form button below.",
      guestCheckout: "Checkout as guest",
      emailPassword: "Email and password",
      whatsappOtp: "WhatsApp OTP (active)",
      registration: "Registration",
      saveQuickKeys: "Save quick toggles",
      notificationsDesc: "SMS coming later. Order templates are on the notifications page.",
      notifEmail: "Email",
      notifWhatsapp: "WhatsApp",
      resendTemplatesHint: "Resend connection and message templates:",
      notificationsLink: "Notifications",
      orderOptionsDesc: "Options collected from the customer at checkout (delivery date, notes, …).",
      enabled: "Enabled",
      required: "Required",
      extraServicesDesc: "Create services once: FREE/FIXED pricing, required, default selected, and visibility by IDs. Synced with store_services.",
      seoDesc: "Title, description, OG, and robots apply to the store. Analytics IDs are saved for a later phase.",
      defaultPageTitle: "Default page title",
      seoDescription: "Description",
      keywords: "Keywords",
      ogImage: "Open Graph image",
      securityDesc: "Maintenance mode and backup status (display).",
      sessionTimeout: "Session timeout (minutes)",
      maintenanceMode: "Maintenance mode (coming soon)",
      maintenanceHint: "Saved in settings — storefront maintenance page is not enabled yet",
      backupStatus: "Backup status",
      integrationsDesc: "Integration status only. Secrets via environment variables — not in the database.",
      legalDesc: "Terms, privacy, returns, and shipping content — shown on /legal/* and the footer. Defaults are Israeli templates, not legal advice.",
      legalBannerHint: "Review texts with a qualified lawyer before relying on them. You can hide the «template» badge after review.",
      showTemplateBanner: "Show «draft template» banner on pages",
      requireCheckoutAcceptance: "Require terms & privacy acceptance at checkout",
      previewTerms: "Preview terms",
      previewPrivacy: "Privacy",
      previewReturns: "Returns",
      previewShipping: "Shipping",
      previewContact: "Contact us",
      termsAr: "Terms & conditions (Arabic)",
      privacyAr: "Privacy policy (Arabic)",
      returnsAr: "Returns & refunds (Arabic)",
      shippingPolicyAr: "Shipping policy (Arabic)",
      termsEn: "Terms (English — optional)",
      privacyEn: "Privacy (English — optional)",
      returnsEn: "Returns (English — optional)",
      shippingPolicyEn: "Shipping policy (English — optional)",
      taxDesc: "Israeli business fields for internal documents (invoice / receipt). No Tax Authority or Green Invoice link yet.",
      businessId: "Business ID (ח.פ. / ע.מ.)",
      businessIdType: "ID type",
      idAuthorizedDealer: "ע.מ. / Authorized dealer",
      idCompany: "ח.פ. / Company",
      idExempt: "עוסק פטור / Exempt",
      idOther: "Other",
      vatRate: "VAT rate % (מע\\"מ)",
      invoicePrefix: "Document number prefix",
      nextInvoiceNumber: "Next serial number",
      defaultDocumentType: "Default document type",
      docTaxInvoiceReceipt: "Tax invoice / receipt",
      docTaxInvoice: "Tax invoice",
      docReceipt: "Receipt",
      issueTrigger: "When to issue the document?",
      issueOnOrder: "On order creation",
      issueOnPayment: "When payment is confirmed",
      issueManual: "Manually from admin only",
      pricesIncludeVat: "Prices include VAT",
      pricesIncludeVatHint: "Common for B2C stores in Israel",
      taxFooterHint: "Store name, address, and phone on invoices come from General and Contact. External provider: soon from Integrations.",
      healthDesc: "Live check of database, storage, email, payments, auth, and environment.",
      refreshHealth: "Refresh check",
      overallStatus: "Overall status: {status}",
    },
    authSettings: {
      title: "Customer authentication",
      description: "Control login channel visibility, order, and «coming soon» without code changes. Secrets stay in the environment.",
      labelAr: "Arabic label",
      whatsappProvider: "WhatsApp provider (non-secret)",
      providerAuto: "Automatic (auto)",
      comingSoon: "Coming soon",
      enabledVisible: "Enabled / visible",
      configuredEnv: "Configured (env ready)",
      moveUp: "Up",
      moveDown: "Down",
      otpExpiry: "OTP expiry (seconds)",
      maxAttempts: "Max attempts",
      resendSeconds: "Resend (seconds)",
      envStatus: "Environment status (secrets):",
      whatsappOtp: "WhatsApp OTP:",
      whatsappProviderEnv: "WhatsApp provider env:",
      resendRecovery: "Resend / recovery email:",
      fromNotifications: "from Notifications",
      footerHint: "When buying WhatsApp Business: choose the provider, remove «coming soon», enable the channel, and add keys in env. Notification templates are on the Notifications page.",
      save: "Save auth channels",
      saveOk: "Customer auth channels saved",
      saveFailed: "Save failed",
      failed: "Failed",
    },
    sidebarUi: {
      noVisibleCategories: "No visible categories",
      rentalFallback: "Rental dresses",
      addRentalChild: "Add a subcategory under rental dresses",
      accessoriesFallback: "Bridal accessories",
    },
    bookingsUi: {
      filterStatus: "Filter by status",
      serviceType: "Service type",
      visibility: "Visibility",
      all: "All",
      addManual: "Add manual booking",
      calendar: "Calendar",
      refresh: "Refresh",
      exportCsv: "Export CSV",
      colCustomer: "Customer",
      colAppointment: "Appointment",
      colService: "Service",
      colSource: "Source",
      colStatus: "Status",
      colActions: "Actions",
      loading: "Loading...",
      empty: "No bookings",
      details: "Details",
      changeStatusAria: "Change status",
      personalizationWriting: "Personalization",
      giftWrap: "🎁 Gift wrapping",
      lastReply: "Last reply:",
      createdAt: "Created:",
      movedToTrash: "Booking moved to trash",
      archived: "Archived",
      unarchived: "Unarchived",
      updateFailed: "Update failed",
      genericError: "Something went wrong",
      loadFailed: "Failed to load bookings",
      invalidResponse: "Invalid response from bookings API",
    },
    messagesUi: {
      title: "Messages",
      subtitle: "Contact form + customer account messages — replies go to account and email",
      refresh: "Refresh",
      exportCsv: "Export CSV",
      search: "Search",
      searchPlaceholder: "Name, email, phone, subject...",
      visibility: "Visibility",
      empty: "No messages",
      fromAccount: "From account",
      contact: "Contact",
      unread: "New",
      read: "Read",
      replied: "Replied",
      localReply: "Local reply",
      replyFailed: "Reply failed",
      lastReply: "Last reply:",
      reply: "Reply",
      copyEmail: "Copy email",
      copyPhone: "Copy phone",
      openMailto: "Open mailto",
      markRead: "Mark as read",
      markUnread: "Mark as unread",
      close: "Close",
      loadFailed: "Failed to load messages",
      invalidResponse: "Invalid server response",
      sendFailed: "Failed to send reply",
      networkError: "Could not reach the server. Check your network.",
      copyFailed: "Copy failed",
      movedToTrash: "Message moved to trash",
      copied: "Copied {label}",
    },
    customersUi: {
      title: "Customers",
      searchPlaceholder: "Search by name, phone, or email…",
      empty: "No customers",
      refresh: "Refresh",
      loadFailed: "Failed to load customers",
    },
    reportsUi: {
      title: "Reports center",
      subtitle: "Read-only analytics · period:",
      noData: "No data",
      loadFailed: "Failed to load reports",
      filters: "Filters",
      period: "Period",
      from: "From",
      to: "To",
      category: "Category",
      product: "Product",
      shippingRegion: "Shipping region",
      deliveryMethod: "Delivery method",
      orderStatus: "Order status",
      bookingStatus: "Booking status",
      all: "All",
      delivery: "Delivery",
      pickup: "Boutique pickup",
      customer: "Customer (name / phone / email)",
      apply: "Apply",
      updating: "Updating...",
      print: "Print",
    },
    notificationsAdmin: {
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
    },`;

function injectTypes(src) {
  if (src.includes("settingsFields:")) {
    console.log("types already has settingsFields");
    return src;
  }
  const marker = "    settingsSections: {";
  const idx = src.indexOf(marker);
  if (idx < 0) throw new Error("settingsSections not found in types");
  return src.slice(0, idx) + settingsFieldsType + "\n" + src.slice(idx);
}

function injectDict(src, block, localeTag) {
  // Insert before settingsSections in each admin block — but settingsSections appears 3 times.
  // Find by unique nearby string per locale.
  const markers = {
    ar: '    settingsSections: {\n      general: "الإعدادات العامة"',
    he: '    settingsSections: {\n      general: "הגדרות כלליות"',
    en: '    settingsSections: {\n      general: "General settings"',
  };
  const marker = markers[localeTag];
  const idx = src.indexOf(marker);
  if (idx < 0) throw new Error("marker not found for " + localeTag);
  if (src.slice(Math.max(0, idx - 80), idx).includes("settingsFields:")) {
    console.log(localeTag, "already has settingsFields nearby");
    return src;
  }
  return src.slice(0, idx) + block + "\n" + src.slice(idx);
}

let types = fs.readFileSync(typesPath, "utf8");
types = injectTypes(types);
fs.writeFileSync(typesPath, types);
console.log("types updated");

let dict = fs.readFileSync(dictPath, "utf8");
dict = injectDict(dict, arSettings, "ar");
dict = injectDict(dict, heSettings, "he");
dict = injectDict(dict, enSettings, "en");
fs.writeFileSync(dictPath, dict);
console.log("dictionaries updated");
