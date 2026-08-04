/** Customer auth settings (settings.key = "customer_auth") */

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
};

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
};

export type CustomerProfile = {
  id: string;
  auth_user_id: string | null;
  /** True for checkout-created guests; false once registered / linked to auth */
  is_guest?: boolean;
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

export type AuthProviderId = "phone" | "google" | "apple" | "email" | "facebook" | "guest";

export const PHONE_COUNTRIES = [
  { code: "IL", dial: "+972", label: "إسرائيل (+972)", flag: "🇮🇱" },
  { code: "PS", dial: "+970", label: "فلسطين (+970)", flag: "🇵🇸" },
  { code: "JO", dial: "+962", label: "الأردن (+962)", flag: "🇯🇴" },
  { code: "SA", dial: "+966", label: "السعودية (+966)", flag: "🇸🇦" },
  { code: "AE", dial: "+971", label: "الإمارات (+971)", flag: "🇦🇪" },
  { code: "EG", dial: "+20", label: "مصر (+20)", flag: "🇪🇬" },
  { code: "US", dial: "+1", label: "USA (+1)", flag: "🇺🇸" },
] as const;
