/**
 * Finish remaining admin chrome i18n.
 * Run: node scripts/i18n-admin-remaining.mjs
 */
import fs from "fs";

const root = "C:/Users/malma/Desktop/nadeendesigns";

function read(p) {
  return fs.readFileSync(`${root}/${p}`, "utf8");
}
function write(p, s) {
  fs.writeFileSync(`${root}/${p}`, s);
  console.log("wrote", p);
}
function patch(rel, fn) {
  const p = `${root}/${rel}`;
  let s = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
  const n = fn(s);
  if (n !== s) {
    fs.writeFileSync(p, n);
    console.log("patched", rel);
  } else console.log("unchanged", rel);
}

// ---------- TYPES: extend bookingsUi / messagesUi / reportsUi + add productsUi / categoriesUi ----------
{
  let types = read("src/lib/i18n/types.ts");

  // Replace bookingsUi block end to add more keys
  if (!types.includes("actionConfirm: string")) {
    types = types.replace(
      `      loadFailed: string;
      invalidResponse: string;
    };
    messagesUi: {`,
      `      loadFailed: string;
      invalidResponse: string;
      loadFailedStatus: string;
      noEmailHint: string;
      actionFailed: string;
      notifiedHint: string;
      updated: string;
      success: string;
      bookingUpdated: string;
      networkError: string;
      personalizationTitle: string;
      giftTitle: string;
      city: string;
      region: string;
      deliveryAddress: string;
      deliveryStatus: string;
      notes: string;
      statusLog: string;
      lifecycleArrived: string;
      lifecycleStarted: string;
      lifecycleCompleted: string;
      lifecycleNoShow: string;
      close: string;
      to: string;
      noEmail: string;
      subject: string;
      message: string;
      cancel: string;
      sendAndUpdate: string;
      actionConfirm: string;
      actionReschedule: string;
      actionCancel: string;
      actionComplete: string;
      actionReply: string;
    };
    messagesUi: {`
    );
  }

  if (!types.includes("replyModalTitle: string")) {
    types = types.replace(
      `      copied: string;
    };
    customersUi: {`,
      `      copied: string;
      replySaved: string;
      replySavedEmailWarn: string;
      replySavedLocal: string;
      replySavedLocalSnack: string;
      replySentOk: string;
      replySentSnack: string;
      emailSendFailed: string;
      replyModalTitle: string;
      to: string;
      subject: string;
      message: string;
      replyPlaceholder: string;
      cancel: string;
      send: string;
      phone: string;
    };
    customersUi: {`
    );
  }

  if (!types.includes("kpiGrossRevenue: string")) {
    types = types.replace(
      `      print: string;
    };
    notificationsAdmin: {`,
      `      print: string;
      createdAt: string;
      exportDenied: string;
      sendFailed: string;
      emailSent: string;
      saveFailed: string;
      scheduleSaved: string;
      kpiGrossRevenue: string;
      kpiNetRevenue: string;
      kpiOrdersCount: string;
      kpiAov: string;
      kpiProductsSold: string;
      kpiAvgShipping: string;
      kpiAvgDiscount: string;
      kpiPendingOrders: string;
      kpiNewBookings: string;
      kpiConfirmed: string;
      kpiCompleted: string;
      kpiCancelled: string;
      kpiNoShow: string;
      kpiCancelRate: string;
      kpiNoShowRate: string;
      kpiBookingRevenue: string;
      kpiBookingRevenueHint: string;
      kpiNewCustomers: string;
      kpiReturning: string;
      kpiAvgSpend: string;
      kpiOrdersPerCustomer: string;
      kpiDelivery: string;
      kpiPickup: string;
      kpiAvgShipCost: string;
      kpiPendingFees: string;
      kpiAvgDeliveryTime: string;
      kpiAvgDeliveryHint: string;
      hoursShort: string;
      kpiGross: string;
      kpiNet: string;
      kpiShipIncome: string;
      kpiDiscounts: string;
      kpiRefunds: string;
      future: string;
      kpiPendingValue: string;
      businessInsights: string;
      topProducts: string;
      lowProducts: string;
      neverOrdered: string;
      topRevenue: string;
      mostViewed: string;
      mostViewedHint: string;
      topCategories: string;
      categoryRevenue: string;
      topCustomersOrders: string;
      topSpenders: string;
      topServices: string;
      peakHours: string;
      peakDays: string;
      bySource: string;
      topRegions: string;
      colProduct: string;
      colQty: string;
      colOrders: string;
      colRevenue: string;
      colType: string;
      colCategory: string;
      colName: string;
      colPhone: string;
      colSpend: string;
      colService: string;
      colCount: string;
      colHour: string;
      colDay: string;
      colSource: string;
      colRegion: string;
      emailReport: string;
      emailLabel: string;
      periodTemplate: string;
      daily: string;
      weekly: string;
      monthly: string;
      customFilters: string;
      sending: string;
      sendNow: string;
      scheduleTitle: string;
      scheduleHint: string;
      frequency: string;
      saveSchedule: string;
      sectionSales: string;
      sectionBookings: string;
      sectionCustomers: string;
      sectionShipping: string;
      sectionFinancial: string;
    };
    notificationsAdmin: {`
    );
  }

  if (!types.includes("productsUi: {")) {
    types = types.replace(
      `    emailProvider: {`,
      `    productsUi: {
      search: string;
      searchPlaceholder: string;
      searchSkuPlaceholder: string;
      filterCategory: string;
      allCategories: string;
      status: string;
      all: string;
      availability: string;
      available: string;
      unavailable: string;
      featured: string;
      notFeatured: string;
      visibility: string;
      addProduct: string;
      addNouf: string;
      colProduct: string;
      colCategory: string;
      colPrice: string;
      colStatus: string;
      colActions: string;
      colStock: string;
      empty: string;
      emptyFiltered: string;
      emptyYet: string;
      edit: string;
      lockedCategory: string;
      loading: string;
      rentalSuffix: string;
      manageSubtitle: string;
      addNew: string;
      nameRequired: string;
      saveFailed: string;
      saveFailedHint: string;
      productCount: string;
      prev: string;
      next: string;
      pageOf: string;
      editProduct: string;
      addProductTitle: string;
      close: string;
      name: string;
      nameAr: string;
      nameEn: string;
      nameHe: string;
      description: string;
      descriptionPlaceholder: string;
      descriptionHint: string;
      price: string;
      salePrice: string;
      stock: string;
      category: string;
      size: string;
      color: string;
      material: string;
      save: string;
      cancel: string;
    };
    categoriesUi: {
      addCategory: string;
      colCategory: string;
      colParent: string;
      colOrder: string;
      colVisibility: string;
      colCover: string;
      empty: string;
      editCategory: string;
      newCategory: string;
      close: string;
      name: string;
      nameAr: string;
      namePlaceholder: string;
      slug: string;
      parent: string;
      noParent: string;
      sortOrder: string;
      href: string;
      productKind: string;
      kindDress: string;
      kindVeil: string;
      kindRobe: string;
      kindAccessories: string;
      displaySettings: string;
      published: string;
      inNav: string;
      onHomepage: string;
      featuredCollection: string;
      description: string;
      descriptionPlaceholder: string;
      seoTitle: string;
      seoTitlePlaceholder: string;
      seoDescription: string;
      seoDescriptionPlaceholder: string;
      customIcon: string;
      coverImage: string;
      ogImage: string;
      save: string;
      saving: string;
      cancel: string;
      edit: string;
      delete: string;
      visible: string;
      hidden: string;
      root: string;
      nameSlugRequired: string;
      saveFailed: string;
      genericError: string;
      visibilityFailed: string;
      deleteConfirm: string;
      deleteFailed: string;
    };
    emailProvider: {`
    );
  }

  if (!types.includes("envKeyHint: string")) {
    types = types.replace(
      `      testFailed: string;
    };
  };
};`,
      `      testFailed: string;
      localPrefix: string;
      done: string;
      envKeyHint: string;
    };
  };
};`
    );
  }

  write("src/lib/i18n/types.ts", types);
}

// ---------- DICT helpers: inject extra keys into each locale's existing blocks ----------
function injectBefore(dict, marker, block, label) {
  if (dict.includes(block.slice(0, 40))) {
    console.log("skip inject", label);
    return dict;
  }
  const idx = dict.indexOf(marker);
  if (idx < 0) {
    console.warn("marker miss", label, marker.slice(0, 40));
    return dict;
  }
  return dict.slice(0, idx) + block + dict.slice(idx);
}

{
  let dict = read("src/lib/i18n/dictionaries.ts");

  // AR bookingsUi extras — before closing of bookingsUi (invalidResponse line)
  const arBookExtra = `      loadFailedStatus: "فشل جلب الحجوزات ({status})",
      noEmailHint: "لا يوجد بريد للعميلة — يمكن تحديث الحالة دون إرسال رسالة.",
      actionFailed: "تعذّر تنفيذ الإجراء",
      notifiedHint: " — وصل إشعار للعميلة",
      updated: "تم التحديث",
      success: "تم بنجاح",
      bookingUpdated: "تم تحديث الحجز",
      networkError: "تعذّر الاتصال بالخادم. تحققي من الشبكة.",
      personalizationTitle: "تفاصيل التخصيص / الطلب",
      giftTitle: "تفاصيل التغليف والإهداء",
      city: "المدينة",
      region: "المنطقة",
      deliveryAddress: "عنوان التوصيل",
      deliveryStatus: "حالة التوصيل",
      notes: "ملاحظات",
      statusLog: "سجل الحالات",
      lifecycleArrived: "وصلت العميلة",
      lifecycleStarted: "بدأ الموعد",
      lifecycleCompleted: "انتهى الموعد",
      lifecycleNoShow: "لم تحضر",
      close: "إغلاق",
      to: "إلى",
      noEmail: " — بدون بريد",
      subject: "الموضوع",
      message: "الرسالة",
      cancel: "إلغاء",
      sendAndUpdate: "إرسال وتحديث",
      actionConfirm: "تأكيد الحجز",
      actionReschedule: "طلب موعد آخر",
      actionCancel: "إلغاء الحجز",
      actionComplete: "تعليم كمكتمل",
      actionReply: "رد",
`;
  dict = injectBefore(
    dict,
    `      invalidResponse: "استجابة غير صالحة من واجهة الحجوزات",
    },
    messagesUi: {
      title: "الرسائل",`,
    arBookExtra,
    "ar-book"
  );

  const heBookExtra = `      loadFailedStatus: "טעינת התורים נכשלה ({status})",
      noEmailHint: "אין אימייל ללקוחה — ניתן לעדכן סטטוס ללא שליחת הודעה.",
      actionFailed: "לא ניתן לבצע את הפעולה",
      notifiedHint: " — נשלחה התראה ללקוחה",
      updated: "עודכן",
      success: "הצלחה",
      bookingUpdated: "התור עודכן",
      networkError: "אין חיבור לשרת. בדקי את הרשת.",
      personalizationTitle: "פרטי התאמה אישית / הזמנה",
      giftTitle: "פרטי עטיפת מתנה",
      city: "עיר",
      region: "אזור",
      deliveryAddress: "כתובת משלוח",
      deliveryStatus: "סטטוס משלוח",
      notes: "הערות",
      statusLog: "יומן סטטוסים",
      lifecycleArrived: "הלקוחה הגיעה",
      lifecycleStarted: "התור התחיל",
      lifecycleCompleted: "התור הסתיים",
      lifecycleNoShow: "לא הגיעה",
      close: "סגור",
      to: "אל",
      noEmail: " — ללא אימייל",
      subject: "נושא",
      message: "הודעה",
      cancel: "ביטול",
      sendAndUpdate: "שליחה ועדכון",
      actionConfirm: "אישור תור",
      actionReschedule: "בקשת מועד אחר",
      actionCancel: "ביטול תור",
      actionComplete: "סמן כהושלם",
      actionReply: "תשובה",
`;
  dict = injectBefore(
    dict,
    `      invalidResponse: "תגובה לא תקינה מממשק התורים",
    },
    messagesUi: {
      title: "הודעות",`,
    heBookExtra,
    "he-book"
  );

  const enBookExtra = `      loadFailedStatus: "Failed to load bookings ({status})",
      noEmailHint: "No customer email — status can be updated without sending a message.",
      actionFailed: "Could not perform the action",
      notifiedHint: " — customer was notified",
      updated: "Updated",
      success: "Success",
      bookingUpdated: "Booking updated",
      networkError: "Could not reach the server. Check your network.",
      personalizationTitle: "Personalization / order details",
      giftTitle: "Gift wrapping details",
      city: "City",
      region: "Region",
      deliveryAddress: "Delivery address",
      deliveryStatus: "Delivery status",
      notes: "Notes",
      statusLog: "Status log",
      lifecycleArrived: "Customer arrived",
      lifecycleStarted: "Appointment started",
      lifecycleCompleted: "Appointment completed",
      lifecycleNoShow: "No-show",
      close: "Close",
      to: "To",
      noEmail: " — no email",
      subject: "Subject",
      message: "Message",
      cancel: "Cancel",
      sendAndUpdate: "Send & update",
      actionConfirm: "Confirm booking",
      actionReschedule: "Request another time",
      actionCancel: "Cancel booking",
      actionComplete: "Mark completed",
      actionReply: "Reply",
`;
  dict = injectBefore(
    dict,
    `      invalidResponse: "Invalid response from bookings API",
    },
    messagesUi: {
      title: "Messages",`,
    enBookExtra,
    "en-book"
  );

  // messages extras
  const arMsg = `      replySaved: "تم حفظ الرد",
      replySavedEmailWarn: "تعذّر الإرسال عبر البريد.",
      replySavedLocal: "تم حفظ الرد محلياً",
      replySavedLocalSnack: "تم حفظ الرد (وضع محلي)",
      replySentOk: "✓ تم إرسال الرد بنجاح.",
      replySentSnack: "تم إرسال الرد عبر البريد",
      emailSendFailed: "تم حفظ الرد — تحذير: فشل إرسال البريد",
      replyModalTitle: "رد على الرسالة",
      to: "إلى",
      subject: "الموضوع",
      message: "الرسالة",
      replyPlaceholder: "اكتبي ردّاً مهنياً للعميلة…",
      cancel: "إلغاء",
      send: "إرسال",
      phone: "الهاتف",
`;
  dict = injectBefore(
    dict,
    `      copied: "تم نسخ {label}",
    },
    customersUi: {
      title: "العملاء",`,
    arMsg,
    "ar-msg"
  );

  const heMsg = `      replySaved: "התשובה נשמרה",
      replySavedEmailWarn: "שליחת האימייל נכשלה.",
      replySavedLocal: "התשובה נשמרה מקומית",
      replySavedLocalSnack: "התשובה נשמרה (מצב מקומי)",
      replySentOk: "✓ התשובה נשלחה בהצלחה.",
      replySentSnack: "התשובה נשלחה באימייל",
      emailSendFailed: "התשובה נשמרה — אזהרה: שליחת האימייל נכשלה",
      replyModalTitle: "תשובה להודעה",
      to: "אל",
      subject: "נושא",
      message: "הודעה",
      replyPlaceholder: "כתבי תשובה מקצועית ללקוחה…",
      cancel: "ביטול",
      send: "שליחה",
      phone: "טלפון",
`;
  dict = injectBefore(
    dict,
    `      copied: "הועתק {label}",
    },
    customersUi: {
      title: "לקוחות",`,
    heMsg,
    "he-msg"
  );

  const enMsg = `      replySaved: "Reply saved",
      replySavedEmailWarn: "Email send failed.",
      replySavedLocal: "Reply saved locally",
      replySavedLocalSnack: "Reply saved (local mode)",
      replySentOk: "✓ Reply sent successfully.",
      replySentSnack: "Reply sent by email",
      emailSendFailed: "Reply saved — warning: email send failed",
      replyModalTitle: "Reply to message",
      to: "To",
      subject: "Subject",
      message: "Message",
      replyPlaceholder: "Write a professional reply…",
      cancel: "Cancel",
      send: "Send",
      phone: "Phone",
`;
  dict = injectBefore(
    dict,
    `      copied: "Copied {label}",
    },
    customersUi: {
      title: "Customers",`,
    enMsg,
    "en-msg"
  );

  write("src/lib/i18n/dictionaries.ts", dict);
}

console.log("phase1 types+partial dict done — continue in same process for reports/products");
