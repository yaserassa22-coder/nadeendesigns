/** Customer auth settings (settings.key = "customer_auth") */

export type AuthChannelId =
  | "email"
  | "guest"
  | "google"
  | "apple"
  | "whatsapp"
  | "facebook";

/**
 * Admin-manageable login channel (visibility, order, coming soon, connection hints).
 * Secrets stay in env (or future admin secret vault like Resend) — never in this JSON.
 */
export type AuthChannelSettings = {
  id: AuthChannelId | string;
  enabled: boolean;
  coming_soon: boolean;
  sort_order: number;
  label_ar: string;
  label_en: string;
  /** Non-secret connection bag (provider pick, display hints). */
  configuration: Record<string, unknown>;
  /** Admin marks infra ready (env / future pasted credentials). */
  configured: boolean;
  /** Env var name hints for secrets — never store secret values. */
  secret_env_refs: string[];
  /** Short admin guidance in Arabic. */
  admin_notes_ar: string;
};

export type CustomerAuthSettings = {
  otp_enabled: boolean;
  google_enabled: boolean;
  apple_enabled: boolean;
  email_password_enabled: boolean;
  /** Future-ready stub — UI shows disabled until true + Facebook app configured */
  facebook_enabled: boolean;
  guest_checkout_enabled: boolean;
  otp_expiration_seconds: number;
  otp_max_attempts: number;
  otp_resend_seconds: number;
  remember_device_days: number;
  /** Source of truth for login modal channel list / order / قريباً. */
  channels: AuthChannelSettings[];
};

export const DEFAULT_AUTH_CHANNELS: AuthChannelSettings[] = [
  {
    id: "email",
    enabled: true,
    coming_soon: false,
    sort_order: 10,
    label_ar: "البريد وكلمة المرور",
    label_en: "Email and password",
    configuration: {},
    configured: true,
    secret_env_refs: [],
    admin_notes_ar:
      "يعتمد على Supabase Auth. إعداد بريد الاستعادة من الإشعارات → Resend.",
  },
  {
    id: "guest",
    enabled: true,
    coming_soon: false,
    sort_order: 20,
    label_ar: "المتابعة كزائرة",
    label_en: "Continue as guest",
    configuration: {},
    configured: true,
    secret_env_refs: [],
    admin_notes_ar: "تصفح وشراء بدون حساب — لا يحتاج اتصالاً خارجياً.",
  },
  {
    id: "google",
    enabled: true,
    coming_soon: false,
    sort_order: 30,
    label_ar: "المتابعة مع Google",
    label_en: "Continue with Google",
    configuration: {},
    configured: false,
    secret_env_refs: ["NEXT_PUBLIC_GOOGLE_AUTH_ENABLED"],
    admin_notes_ar:
      "فعّلي مزوّد Google في Supabase ثم عيّني NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true، أو علّمي «مُعد» بعد التحقق.",
  },
  {
    id: "apple",
    enabled: true,
    coming_soon: false,
    sort_order: 40,
    label_ar: "المتابعة مع Apple",
    label_en: "Continue with Apple",
    configuration: {},
    configured: false,
    secret_env_refs: ["NEXT_PUBLIC_APPLE_AUTH_ENABLED"],
    admin_notes_ar:
      "فعّلي مزوّد Apple في Supabase ثم عيّني NEXT_PUBLIC_APPLE_AUTH_ENABLED=true.",
  },
  {
    id: "whatsapp",
    enabled: true,
    coming_soon: true,
    sort_order: 50,
    label_ar: "المتابعة مع واتساب",
    label_en: "Continue with WhatsApp",
    configuration: {
      provider: "auto",
      phone_number_id_hint: "",
      from_number_hint: "",
    },
    configured: false,
    secret_env_refs: [
      "WHATSAPP_PROVIDER",
      "WHATSAPP_META_TOKEN",
      "WHATSAPP_META_PHONE_NUMBER_ID",
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_WHATSAPP_FROM",
      "WHATSAPP_360DIALOG_API_KEY",
    ],
    admin_notes_ar:
      "عند شراء واتساب للأعمال: اختاري المزوّد، أزيلي «قريباً»، فعّلي القناة، وأضيفي المفاتيح عبر متغيرات البيئة (أو لاحقاً من لوحة الإشعارات). لا حاجة لتعديل الكود لتفعيل/إخفاء الزر.",
  },
  {
    id: "facebook",
    enabled: false,
    coming_soon: true,
    sort_order: 60,
    label_ar: "المتابعة مع Facebook",
    label_en: "Continue with Facebook",
    configuration: {},
    configured: false,
    secret_env_refs: [],
    admin_notes_ar: "محجوز للمستقبل — أظهريه كـ قريباً أو أخفيه بإيقاف التفعيل.",
  },
];

export const DEFAULT_CUSTOMER_AUTH_SETTINGS: CustomerAuthSettings = {
  otp_enabled: true,
  google_enabled: true,
  apple_enabled: true,
  email_password_enabled: true,
  facebook_enabled: false,
  guest_checkout_enabled: true,
  otp_expiration_seconds: 300,
  otp_max_attempts: 5,
  otp_resend_seconds: 60,
  remember_device_days: 30,
  channels: DEFAULT_AUTH_CHANNELS,
};

/** Opaque auth channel id stored on customers (admin display). Future providers = new string ids. */
export type CustomerAuthProvider = string;

export type CustomerProfile = {
  id: string;
  auth_user_id: string | null;
  /** True for checkout-created guests; false once registered / linked to auth */
  is_guest?: boolean;
  /** Auth channel: whatsapp | google | apple | guest | email */
  provider?: CustomerAuthProvider | string | null;
  customer_key: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  birthday: string | null;
  wedding_date: string | null;
  preferred_language: string;
  default_address_id: string | null;
  reward_points: number;
  vip_tier: string;
  store_credit: number;
  referral_code: string | null;
  last_login_at: string | null;
  login_count: number;
  /** Light audit of guest→registered merges (orders/bookings/wishlist counts). */
  merge_meta?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type CustomerTypeLabel = "registered" | "guest";

export type CustomerAddress = {
  id: string;
  customer_id: string;
  label: string;
  full_name: string;
  phone: string | null;
  city: string | null;
  region: string | null;
  street: string | null;
  building: string | null;
  apartment: string | null;
  postal_code: string | null;
  notes: string | null;
  is_default: boolean;
};

export type WishlistItem = {
  id: string;
  customer_id: string;
  product_kind: string;
  product_id: string;
  product_slug: string | null;
  product_title: string | null;
  product_image_url: string | null;
  created_at: string;
};

export type AuthProviderId = string;

export const PHONE_COUNTRIES = [
  { code: "IL", dial: "+972", label: "إسرائيل (+972)", flag: "🇮🇱" },
  { code: "PS", dial: "+970", label: "فلسطين (+970)", flag: "🇵🇸" },
  { code: "JO", dial: "+962", label: "الأردن (+962)", flag: "🇯🇴" },
  { code: "SA", dial: "+966", label: "السعودية (+966)", flag: "🇸🇦" },
  { code: "AE", dial: "+971", label: "الإمارات (+971)", flag: "🇦🇪" },
  { code: "EG", dial: "+20", label: "مصر (+20)", flag: "🇪🇬" },
  { code: "US", dial: "+1", label: "USA (+1)", flag: "🇺🇸" },
] as const;

/** Resolve channel row from settings (merged defaults). */
export function getAuthChannel(
  settings: CustomerAuthSettings,
  id: string
): AuthChannelSettings | undefined {
  return settings.channels.find((c) => c.id === id);
}
