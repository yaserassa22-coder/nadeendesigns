/**
 * Store Settings (settings.key = "store")
 *
 * Architecture choice: all store config lives as JSONB under a single `store`
 * row in the existing `settings` table. Payment providers are an array inside
 * that JSON (not a separate table) — secrets never stored; only `configured`
 * flags + env-var references. Shipping/contact fields that the storefront
 * already reads from `site` are synced on save so CMS + shipping merges stay safe.
 */

import {
  DEFAULT_PRIVACY_AR,
  DEFAULT_PRIVACY_EN,
  DEFAULT_PRIVACY_HE,
  DEFAULT_RETURNS_AR,
  DEFAULT_RETURNS_EN,
  DEFAULT_RETURNS_HE,
  DEFAULT_SHIPPING_POLICY_AR,
  DEFAULT_SHIPPING_POLICY_EN,
  DEFAULT_SHIPPING_POLICY_HE,
  DEFAULT_TERMS_AR,
  DEFAULT_TERMS_EN,
  DEFAULT_TERMS_HE,
} from "@/lib/legal/default-policies";

export type StorePaymentProviderId =
  | "cod"
  | "credit_card"
  | "bit"
  | "stripe"
  | "paypal"
  | "tranzila"
  | "bank_transfer"
  | "apple_pay"
  | "google_pay";

export type StorePaymentProvider = {
  id: StorePaymentProviderId | string;
  name: string;
  name_ar: string;
  name_he?: string;
  enabled: boolean;
  coming_soon: boolean;
  sort_order: number;
  icon: string;
  description: string;
  description_ar: string;
  description_he?: string;
  /** Non-secret config bag (public keys, publishable ids, display labels). */
  configuration: Record<string, unknown>;
  /** Env var name hint — never store secret values in DB. */
  secret_env_ref?: string | null;
  configured: boolean;
};

export type StoreGeneralSettings = {
  store_name: string;
  description: string;
  description_ar: string;
  description_he: string;
  logo_url: string;
  favicon_url: string;
  business_email: string;
  business_phone: string;
  /** English address (storefront EN). */
  business_address: string;
  business_address_ar: string;
  business_address_he: string;
  /** English working hours (storefront EN). */
  working_hours: string;
  working_hours_ar: string;
  working_hours_he: string;
  currency: string;
  /** Default storefront locale when visitor has no preference. */
  language: string;
  /**
   * Locales customers may choose in the storefront language bar.
   * Subset of ar | he | en. Always includes at least one.
   */
  enabled_locales: string[];
  timezone: string;
};

export type StoreShippingSettings = {
  shipping_enabled: boolean;
  shipping_flat_fee: number;
  shipping_free_threshold: number;
  boutique_pickup_enabled: boolean;
  delivery_enabled: boolean;
  /** Default estimate label when region has none */
  estimated_delivery_ar: string;
};

export type StoreContactSettings = {
  phone: string;
  email: string;
  whatsapp: string;
  instagram_url: string;
  facebook_url: string;
  tiktok_url: string;
  location_ar: string;
  google_maps_url: string;
};

export type StoreSocialSettings = {
  instagram_url: string;
  facebook_url: string;
  tiktok_url: string;
  pinterest_url: string;
  youtube_url: string;
};

export type StoreHomepageSettings = {
  hero: boolean;
  featured_categories: boolean;
  featured_products: boolean;
  /** Mid-page Accessories editorial slideshow (veils + bridal robes). */
  accessories_editorial: boolean;
  collections: boolean;
  testimonials: boolean;
  /** Customer visual gallery — Worn by You */
  worn_by_you: boolean;
  instagram: boolean;
  newsletter: boolean;
};

export type StoreAuthSettings = {
  guest_checkout_enabled: boolean;
  google_enabled: boolean;
  apple_enabled: boolean;
  email_password_enabled: boolean;
  phone_otp_enabled: boolean;
  registration_enabled: boolean;
};

export type StoreNotificationChannelSettings = {
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  sms_enabled: boolean;
  sms_coming_soon: boolean;
};

export type StoreSeoSettings = {
  title: string;
  description: string;
  keywords: string;
  og_image_url: string;
  robots_index: boolean;
  robots_follow: boolean;
  google_analytics_id: string;
  /** Merchant must activate after connecting an ID */
  google_analytics_enabled: boolean;
  meta_pixel_id: string;
  /** Merchant must activate after connecting an ID */
  meta_pixel_enabled: boolean;
};

export type StoreSecuritySettings = {
  session_timeout_minutes: number;
  maintenance_mode: boolean;
  /** Optional storefront message while maintenance is on. */
  maintenance_message_ar: string;
  maintenance_message_he: string;
  maintenance_message_en: string;
  backup_status: "unknown" | "ok" | "warning" | "error";
  backup_last_at: string | null;
  backup_note: string;
};

export type StoreIntegrationStub = {
  id: string;
  name: string;
  enabled: boolean;
  coming_soon: boolean;
  configured: boolean;
  /** Env var name(s) that must be set — never secret values. */
  env_refs: string[];
  notes: string;
};

export type StoreOrderOptionKey =
  | "recipient_name"
  | "gift_message"
  | "delivery_address"
  | "delivery_date"
  | "delivery_time"
  | "order_notes";

export type StoreOrderOption = {
  key: StoreOrderOptionKey;
  label: string;
  label_ar: string;
  enabled: boolean;
  required: boolean;
};

export type StoreOrderOptionsSettings = {
  options: StoreOrderOption[];
};

export type StoreExtraServiceVisibility = {
  scope: "all" | "product_types" | "categories" | "collections" | "products";
  product_types?: string[];
  category_ids?: string[];
  collection_ids?: string[];
  product_ids?: string[];
};

export type StoreExtraService = {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  pricing_mode: "FREE" | "FIXED_PRICE";
  price: number;
  enabled: boolean;
  visible: boolean;
  required: boolean;
  default_selected: boolean;
  available_online: boolean;
  available_in_store: boolean;
  sort_order: number;
  visibility: StoreExtraServiceVisibility;
};

export type StoreExtraServicesSettings = {
  services: StoreExtraService[];
};

/**
 * Legal / policy page content — admin-editable (AR / HE / EN).
 * Defaults are Israel-oriented starter templates (not legal advice).
 */
export type StoreLegalSettings = {
  terms_ar: string;
  terms_he: string;
  terms_en: string;
  privacy_ar: string;
  privacy_he: string;
  privacy_en: string;
  returns_ar: string;
  returns_he: string;
  returns_en: string;
  shipping_policy_ar: string;
  shipping_policy_he: string;
  shipping_policy_en: string;
  /** Shown on legal pages — reminds merchant these are templates */
  show_template_banner: boolean;
  /** Require checkout checkbox accepting terms + privacy */
  require_checkout_acceptance: boolean;
  /** Show storefront cookie consent banner */
  cookie_banner_enabled: boolean;
  updated_at: string | null;
};

/**
 * Israeli tax / invoice settings for internal חשבונית / קבלה documents.
 * No government API integration yet — structure ready for future providers.
 */
export type StoreTaxDocumentType =
  | "receipt"
  | "tax_invoice"
  | "tax_invoice_receipt";

export type StoreBusinessIdType =
  | "company"
  | "authorized_dealer"
  | "exempt"
  | "other";

export type StoreTaxSettings = {
  /** ח.פ. / ע.מ. / מספר עוסק */
  business_id: string;
  business_id_type: StoreBusinessIdType;
  /** VAT rate percent, e.g. 18 for Israel (admin-configurable) */
  vat_rate: number;
  /** When true, catalog prices already include VAT */
  prices_include_vat: boolean;
  /** Default document type issued for shop orders */
  default_document_type: StoreTaxDocumentType;
  /**
   * When to issue: on_order (after place) | on_payment_received | manual
   */
  issue_trigger: "on_order" | "on_payment_received" | "manual";
  /** Invoice number prefix, e.g. INV */
  invoice_prefix: string;
  /** Next sequential number (also mirrored in invoice_sequence table) */
  next_invoice_number: number;
  /** Future provider stub — green_invoice / morning / hashavshevet / none */
  provider: "none" | "green_invoice" | "morning" | "hashavshevet" | "icount" | "easycount" | "internal" | string;
  provider_coming_soon: boolean;
  provider_notes: string;
};

export type StoreSettings = {
  general: StoreGeneralSettings;
  payments: {
    providers: StorePaymentProvider[];
  };
  shipping: StoreShippingSettings;
  contact: StoreContactSettings;
  social: StoreSocialSettings;
  homepage: StoreHomepageSettings;
  authentication: StoreAuthSettings;
  notifications: StoreNotificationChannelSettings;
  seo: StoreSeoSettings;
  security: StoreSecuritySettings;
  integrations: StoreIntegrationStub[];
  /** Sprint 2 Phase 1 — config only; checkout wiring is Phase 2 */
  order_options: StoreOrderOptionsSettings;
  extra_services: StoreExtraServicesSettings;
  /** Legal pages (terms, privacy, returns, shipping policy) */
  legal: StoreLegalSettings;
  /** Israeli VAT + tax document settings */
  tax: StoreTaxSettings;
};

export type StoreSettingsSection =
  | "general"
  | "payments"
  | "shipping"
  | "contact"
  | "social"
  | "homepage"
  | "authentication"
  | "notifications"
  | "seo"
  | "security"
  | "integrations"
  | "order_options"
  | "extra_services"
  | "legal"
  | "tax";

export type SystemHealthStatus = "green" | "yellow" | "red";

export type SystemHealthCheck = {
  id: string;
  label: string;
  label_ar: string;
  status: SystemHealthStatus;
  detail: string;
  detail_ar: string;
};

export type SystemHealthReport = {
  overall: SystemHealthStatus;
  checked_at: string;
  checks: SystemHealthCheck[];
};

export const DEFAULT_PAYMENT_PROVIDERS: StorePaymentProvider[] = [
  {
    id: "cod",
    name: "Cash on Delivery",
    name_ar: "الدفع عند الاستلام",
    name_he: "תשלום במסירה",
    enabled: true,
    coming_soon: false,
    sort_order: 0,
    icon: "banknote",
    description: "Pay when you receive your order",
    description_ar: "ادفعي عند استلام طلبكِ من البوتيك أو مع المندوب",
    description_he: "שלמי בעת קבלת ההזמנה מהבוטיק או עם השליח",
    configuration: {},
    secret_env_ref: null,
    configured: true,
  },
  {
    id: "credit_card",
    name: "Credit Card",
    name_ar: "بطاقة ائتمان",
    name_he: "כרטיס אשראי",
    enabled: true,
    coming_soon: true,
    sort_order: 1,
    icon: "credit-card",
    description: "Pay by credit or debit card",
    description_ar: "الدفع ببطاقة ائتمان أو بطاقة بنكية — قريباً",
    description_he: "תשלום בכרטיס אשראי או כרטיס בנקאי — בקרוב",
    configuration: {},
    secret_env_ref: null,
    configured: false,
  },
  {
    id: "bit",
    name: "Bit",
    name_ar: "Bit",
    name_he: "ביט",
    enabled: false,
    coming_soon: true,
    sort_order: 2,
    icon: "smartphone",
    description: "Pay with Bit",
    description_ar: "الدفع عبر Bit — فعّلي من لوحة الإدارة",
    description_he: "תשלום בביט — הפעילו מלוח הניהול",
    configuration: {},
    secret_env_ref: null,
    configured: false,
  },
  {
    id: "stripe",
    name: "Stripe",
    name_ar: "سترايب",
    enabled: true,
    coming_soon: true,
    sort_order: 3,
    icon: "credit-card",
    description: "Cards via Stripe",
    description_ar: "بطاقات عبر سترايب — قريباً",
    configuration: {},
    secret_env_ref: "STRIPE_SECRET_KEY",
    configured: false,
  },
  {
    id: "paypal",
    name: "PayPal",
    name_ar: "باي بال",
    enabled: true,
    coming_soon: true,
    sort_order: 4,
    icon: "wallet",
    description: "PayPal checkout",
    description_ar: "باي بال — قريباً",
    configuration: {},
    secret_env_ref: "PAYPAL_CLIENT_SECRET",
    configured: false,
  },
  {
    id: "tranzila",
    name: "Tranzila",
    name_ar: "ترانزيلا",
    enabled: true,
    coming_soon: true,
    sort_order: 5,
    icon: "credit-card",
    description: "Israeli payment gateway",
    description_ar: "بوابة ترانزيلا — قريباً",
    configuration: {},
    secret_env_ref: "TRANZILA_API_KEY",
    configured: false,
  },
  {
    id: "bank_transfer",
    name: "Bank Transfer",
    name_ar: "تحويل بنكي",
    enabled: true,
    coming_soon: true,
    sort_order: 6,
    icon: "building",
    description: "Manual bank transfer",
    description_ar: "تحويل بنكي يدوي — قريباً",
    configuration: {},
    secret_env_ref: null,
    configured: false,
  },
  {
    id: "apple_pay",
    name: "Apple Pay",
    name_ar: "Apple Pay",
    enabled: true,
    coming_soon: true,
    sort_order: 7,
    icon: "smartphone",
    description: "Apple Pay",
    description_ar: "Apple Pay — قريباً",
    configuration: {},
    secret_env_ref: "APPLE_PAY_MERCHANT_ID",
    configured: false,
  },
  {
    id: "google_pay",
    name: "Google Pay",
    name_ar: "Google Pay",
    enabled: true,
    coming_soon: true,
    sort_order: 8,
    icon: "smartphone",
    description: "Google Pay",
    description_ar: "Google Pay — قريباً",
    configuration: {},
    secret_env_ref: "GOOGLE_PAY_MERCHANT_ID",
    configured: false,
  },
];

export const DEFAULT_STORE_INTEGRATIONS: StoreIntegrationStub[] = [
  {
    id: "stripe",
    name: "Stripe",
    enabled: false,
    coming_soon: true,
    configured: false,
    env_refs: ["STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"],
    notes: "Coming soon — store configured flag only; secrets via env.",
  },
  {
    id: "paypal",
    name: "PayPal",
    enabled: false,
    coming_soon: true,
    configured: false,
    env_refs: ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"],
    notes: "Coming soon",
  },
  {
    id: "tranzila",
    name: "Tranzila",
    enabled: false,
    coming_soon: true,
    configured: false,
    env_refs: ["TRANZILA_TERMINAL", "TRANZILA_API_KEY"],
    notes: "Coming soon",
  },
  {
    id: "google",
    name: "Google Auth / Analytics",
    enabled: false,
    coming_soon: false,
    configured: false,
    env_refs: [
      "NEXT_PUBLIC_GOOGLE_AUTH_ENABLED",
      "NEXT_PUBLIC_GA_MEASUREMENT_ID",
    ],
    notes: "OAuth + GA IDs via env / SEO section",
  },
  {
    id: "apple",
    name: "Apple Auth",
    enabled: false,
    coming_soon: false,
    configured: false,
    env_refs: ["NEXT_PUBLIC_APPLE_AUTH_ENABLED"],
    notes: "Supabase Apple provider + env flag",
  },
  {
    id: "meta",
    name: "Meta (WhatsApp / Pixel)",
    enabled: false,
    coming_soon: false,
    configured: false,
    env_refs: [
      "WHATSAPP_META_TOKEN",
      "WHATSAPP_META_PHONE_NUMBER_ID",
      "NEXT_PUBLIC_META_PIXEL_ID",
    ],
    notes: "WhatsApp OTP + Pixel — secrets in env only",
  },
  {
    id: "ga",
    name: "Google Analytics",
    enabled: false,
    coming_soon: false,
    configured: false,
    env_refs: ["NEXT_PUBLIC_GA_MEASUREMENT_ID"],
    notes: "Measurement ID also editable in SEO section",
  },
  {
    id: "green_invoice",
    name: "Green Invoice / Morning",
    enabled: false,
    coming_soon: true,
    configured: false,
    env_refs: ["GREEN_INVOICE_API_KEY", "MORNING_API_KEY"],
    notes:
      "Future Israeli e-invoicing provider — internal documents only for now; secrets via env when connected.",
  },
];

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  general: {
    store_name: "Nadeen Designs",
    description: "Luxury bridal boutique",
    description_ar:
      "بوتيك فاخر لفساتين الزفاف والإكسسوارات",
    description_he: "בוטיק יוקרתי לשמלות כלה ואקססוריז",
    logo_url: "",
    favicon_url: "",
    business_email: "hello@nadeendesigns.com",
    business_phone: "+966500000000",
    business_address: "Israel",
    business_address_ar: "إسرائيل",
    business_address_he: "ישראל",
    working_hours: "Sun–Sat: 10:00–21:00",
    working_hours_ar: "الأحد - السبت: 10:00 ص - 9:00 م",
    working_hours_he: "ראשון–שבת: 10:00–21:00",
    currency: "ILS",
    language: "ar",
    enabled_locales: ["ar", "he", "en"],
    timezone: "Asia/Jerusalem",
  },
  payments: {
    providers: DEFAULT_PAYMENT_PROVIDERS,
  },
  shipping: {
    shipping_enabled: true,
    shipping_flat_fee: 0,
    shipping_free_threshold: 0,
    boutique_pickup_enabled: true,
    delivery_enabled: true,
    estimated_delivery_ar: "",
  },
  contact: {
    phone: "+966500000000",
    email: "hello@nadeendesigns.com",
    whatsapp: "966500000000",
    instagram_url: "https://www.instagram.com/nadeendesign_/",
    facebook_url: "",
    tiktok_url: "",
    location_ar: "الرياض، المملكة العربية السعودية",
    google_maps_url: "",
  },
  social: {
    instagram_url: "https://www.instagram.com/nadeendesign_/",
    facebook_url: "",
    tiktok_url: "",
    pinterest_url: "",
    youtube_url: "",
  },
  homepage: {
    hero: true,
    featured_categories: true,
    featured_products: true,
    accessories_editorial: true,
    collections: true,
    testimonials: false,
    worn_by_you: true,
    instagram: true,
    newsletter: false,
  },
  authentication: {
    guest_checkout_enabled: true,
    google_enabled: true,
    apple_enabled: true,
    email_password_enabled: true,
    phone_otp_enabled: true,
    registration_enabled: true,
  },
  notifications: {
    email_enabled: true,
    whatsapp_enabled: true,
    sms_enabled: false,
    sms_coming_soon: true,
  },
  seo: {
    title: "Nadeen Designs | بوتيك فساتين الزفاف الفاخرة",
    description:
      "Nadeen Designs — بوتيك فاخر لفساتين الزفاف والإيجار وطرحة العروس وبرنص العروس وتصميم الفساتين الخاصة.",
    keywords:
      "فساتين زفاف, بوتيك عروس, Nadeen Designs, طرحة العروس, برنص العروس",
    og_image_url: "",
    robots_index: true,
    robots_follow: true,
    google_analytics_id: "",
    google_analytics_enabled: false,
    meta_pixel_id: "",
    meta_pixel_enabled: false,
  },
  security: {
    session_timeout_minutes: 60,
    maintenance_mode: false,
    maintenance_message_ar:
      "المتجر قيد الصيانة حالياً. نعود إليكِ قريباً بإطلالة أجمل.",
    maintenance_message_he:
      "החנות בתחזוקה כרגע. נחזור אלייך בקרוב עם חוויה יפה יותר.",
    maintenance_message_en:
      "The boutique is briefly under maintenance. We’ll be back shortly with something beautiful.",
    backup_status: "unknown",
    backup_last_at: null,
    backup_note: "النسخ الاحتياطي يُدار عبر Supabase",
  },
  integrations: DEFAULT_STORE_INTEGRATIONS,
  order_options: {
    options: [
      {
        key: "recipient_name",
        label: "Recipient Name",
        label_ar: "اسم المستلم",
        enabled: false,
        required: false,
      },
      {
        key: "gift_message",
        label: "Gift Message",
        label_ar: "رسالة هدية",
        enabled: false,
        required: false,
      },
      {
        key: "delivery_address",
        label: "Delivery Address",
        label_ar: "عنوان التوصيل",
        enabled: true,
        required: false,
      },
      {
        key: "delivery_date",
        label: "Delivery Date",
        label_ar: "تاريخ التوصيل",
        enabled: false,
        required: false,
      },
      {
        key: "delivery_time",
        label: "Delivery Time",
        label_ar: "وقت التوصيل",
        enabled: false,
        required: false,
      },
      {
        key: "order_notes",
        label: "Order Notes",
        label_ar: "ملاحظات الطلب",
        enabled: true,
        required: false,
      },
    ],
  },
  extra_services: {
    services: [
      {
        id: "writing_personalization",
        name: "Writing Personalization",
        name_ar: "تخصيص الكتابة",
        description: "",
        description_ar: "",
        pricing_mode: "FREE",
        price: 0,
        enabled: false,
        visible: true,
        required: false,
        default_selected: false,
        available_online: true,
        available_in_store: false,
        sort_order: 0,
        visibility: { scope: "all" },
      },
      {
        id: "gift_wrap",
        name: "Gift Wrap",
        name_ar: "تغليف هدية",
        description: "",
        description_ar: "",
        pricing_mode: "FREE",
        price: 0,
        enabled: false,
        visible: true,
        required: false,
        default_selected: false,
        available_online: true,
        available_in_store: false,
        sort_order: 1,
        visibility: { scope: "all" },
      },
      {
        id: "greeting_card",
        name: "Greeting Card",
        name_ar: "بطاقة تهنئة",
        description: "",
        description_ar: "",
        pricing_mode: "FREE",
        price: 0,
        enabled: false,
        visible: true,
        required: false,
        default_selected: false,
        available_online: true,
        available_in_store: false,
        sort_order: 2,
        visibility: { scope: "all" },
      },
      {
        id: "luxury_box",
        name: "Luxury Box",
        name_ar: "علبة فاخرة",
        description: "",
        description_ar: "",
        pricing_mode: "FREE",
        price: 0,
        enabled: false,
        visible: true,
        required: false,
        default_selected: false,
        available_online: true,
        available_in_store: false,
        sort_order: 3,
        visibility: { scope: "all" },
      },
      {
        id: "express_delivery",
        name: "Express Delivery",
        name_ar: "توصيل سريع",
        description: "",
        description_ar: "",
        pricing_mode: "FREE",
        price: 0,
        enabled: false,
        visible: true,
        required: false,
        default_selected: false,
        available_online: true,
        available_in_store: false,
        sort_order: 4,
        visibility: { scope: "all" },
      },
    ],
  },
  legal: {
    terms_ar: DEFAULT_TERMS_AR,
    terms_he: DEFAULT_TERMS_HE,
    terms_en: DEFAULT_TERMS_EN,
    privacy_ar: DEFAULT_PRIVACY_AR,
    privacy_he: DEFAULT_PRIVACY_HE,
    privacy_en: DEFAULT_PRIVACY_EN,
    returns_ar: DEFAULT_RETURNS_AR,
    returns_he: DEFAULT_RETURNS_HE,
    returns_en: DEFAULT_RETURNS_EN,
    shipping_policy_ar: DEFAULT_SHIPPING_POLICY_AR,
    shipping_policy_he: DEFAULT_SHIPPING_POLICY_HE,
    shipping_policy_en: DEFAULT_SHIPPING_POLICY_EN,
    show_template_banner: true,
    require_checkout_acceptance: true,
    cookie_banner_enabled: true,
    updated_at: null,
  },
  tax: {
    business_id: "",
    business_id_type: "authorized_dealer",
    vat_rate: 18,
    prices_include_vat: true,
    default_document_type: "tax_invoice_receipt",
    issue_trigger: "on_order",
    invoice_prefix: "ND",
    next_invoice_number: 1,
    provider: "none",
    provider_coming_soon: true,
    provider_notes:
      "المستندات داخلية حاليًا (جاهزة للإدارة). ربط Green Invoice / Morning / Hashavshevet قادم — بدون API حكومي بعد.",
  },
};
