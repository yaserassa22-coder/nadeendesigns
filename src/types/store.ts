/**
 * Store Settings (settings.key = "store")
 *
 * Architecture choice: all store config lives as JSONB under a single `store`
 * row in the existing `settings` table. Payment providers are an array inside
 * that JSON (not a separate table) — secrets never stored; only `configured`
 * flags + env-var references. Shipping/contact fields that the storefront
 * already reads from `site` are synced on save so CMS + shipping merges stay safe.
 */

export type StorePaymentProviderId =
  | "cod"
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
  enabled: boolean;
  coming_soon: boolean;
  sort_order: number;
  icon: string;
  description: string;
  description_ar: string;
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
  logo_url: string;
  favicon_url: string;
  business_email: string;
  business_phone: string;
  business_address: string;
  business_address_ar: string;
  working_hours: string;
  working_hours_ar: string;
  currency: string;
  language: string;
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
  collections: boolean;
  testimonials: boolean;
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
  meta_pixel_id: string;
};

export type StoreSecuritySettings = {
  session_timeout_minutes: number;
  maintenance_mode: boolean;
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

export type StoreExtraService = {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  pricing_mode: "FREE" | "FIXED_PRICE";
  price: number;
  enabled: boolean;
  sort_order: number;
};

export type StoreExtraServicesSettings = {
  services: StoreExtraService[];
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
  | "extra_services";

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
    enabled: true,
    coming_soon: false,
    sort_order: 0,
    icon: "banknote",
    description: "Pay when you receive your order",
    description_ar: "ادفعي عند استلام طلبكِ من البوتيك أو مع المندوب",
    configuration: {},
    secret_env_ref: null,
    configured: true,
  },
  {
    id: "stripe",
    name: "Stripe",
    name_ar: "سترايب",
    enabled: false,
    coming_soon: true,
    sort_order: 1,
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
    enabled: false,
    coming_soon: true,
    sort_order: 2,
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
    enabled: false,
    coming_soon: true,
    sort_order: 3,
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
    enabled: false,
    coming_soon: true,
    sort_order: 4,
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
    enabled: false,
    coming_soon: true,
    sort_order: 5,
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
    enabled: false,
    coming_soon: true,
    sort_order: 6,
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
];

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  general: {
    store_name: "Nadeen Designs",
    description: "Luxury bridal boutique",
    description_ar:
      "بوتيك فاخر لفساتين الزفاف والإكسسوارات",
    logo_url: "",
    favicon_url: "",
    business_email: "hello@nadeendesigns.com",
    business_phone: "+966500000000",
    business_address: "Riyadh, Saudi Arabia",
    business_address_ar: "الرياض، المملكة العربية السعودية",
    working_hours: "Sat–Thu 10:00–21:00",
    working_hours_ar: "السبت - الخميس: 10:00 ص - 9:00 م",
    currency: "ILS",
    language: "ar",
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
    collections: true,
    testimonials: false,
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
    meta_pixel_id: "",
  },
  security: {
    session_timeout_minutes: 60,
    maintenance_mode: false,
    backup_status: "unknown",
    backup_last_at: null,
    backup_note: "النسخ الاحتياطي يُدار عبر Supabase — الحالة للعرض فقط",
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
        id: "gift_wrap",
        name: "Gift Wrap",
        name_ar: "تغليف هدية",
        description: "",
        description_ar: "",
        pricing_mode: "FREE",
        price: 0,
        enabled: false,
        sort_order: 0,
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
        sort_order: 1,
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
        sort_order: 2,
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
        sort_order: 3,
      },
    ],
  },
};
