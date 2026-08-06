import {
  DEFAULT_CUSTOMER_AUTH_SETTINGS,
  type CustomerAuthSettings,
} from "@/types/customer-auth";
import { isCustomerAuthEmailReady } from "@/lib/notifications/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

let cached: CustomerAuthSettings | null = null;
let cachedAt = 0;
const CACHE_MS = 30_000;

export function mergeCustomerAuthSettings(
  value?: Partial<CustomerAuthSettings> | null
): CustomerAuthSettings {
  const src = value ?? {};
  return {
    ...DEFAULT_CUSTOMER_AUTH_SETTINGS,
    ...src,
    otp_expiration_seconds: Math.min(
      900,
      Math.max(
        60,
        Number(src.otp_expiration_seconds) ||
          DEFAULT_CUSTOMER_AUTH_SETTINGS.otp_expiration_seconds
      )
    ),
    otp_max_attempts: Math.min(
      10,
      Math.max(
        3,
        Number(src.otp_max_attempts) ||
          DEFAULT_CUSTOMER_AUTH_SETTINGS.otp_max_attempts
      )
    ),
    otp_resend_seconds: Math.min(
      300,
      Math.max(
        30,
        Number(src.otp_resend_seconds) ||
          DEFAULT_CUSTOMER_AUTH_SETTINGS.otp_resend_seconds
      )
    ),
    remember_device_days: Math.min(
      90,
      Math.max(
        1,
        Number(src.remember_device_days) ||
          DEFAULT_CUSTOMER_AUTH_SETTINGS.remember_device_days
      )
    ),
  };
}

export async function getCustomerAuthSettings(
  force = false
): Promise<CustomerAuthSettings> {
  const now = Date.now();
  if (!force && cached && now - cachedAt < CACHE_MS) return cached;

  if (!isSupabaseConfigured()) {
    cached = DEFAULT_CUSTOMER_AUTH_SETTINGS;
    cachedAt = now;
    return cached;
  }

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "customer_auth")
      .maybeSingle();
    cached = mergeCustomerAuthSettings(
      (data?.value as Partial<CustomerAuthSettings> | null) ?? null
    );
    cachedAt = now;
    return cached;
  } catch {
    return DEFAULT_CUSTOMER_AUTH_SETTINGS;
  }
}

export async function saveCustomerAuthSettings(
  value: CustomerAuthSettings
): Promise<CustomerAuthSettings> {
  const merged = mergeCustomerAuthSettings(value);
  if (!isSupabaseConfigured()) {
    cached = merged;
    cachedAt = Date.now();
    return merged;
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from("settings").upsert({
    key: "customer_auth",
    value: merged,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  cached = merged;
  cachedAt = Date.now();
  return merged;
}

/** Public flags for login modal (no secrets). */
export function getAuthEnvFlags() {
  const metaConfigured = Boolean(
    process.env.WHATSAPP_META_TOKEN?.trim() &&
      process.env.WHATSAPP_META_PHONE_NUMBER_ID?.trim()
  );
  const twilioWaConfigured = Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_WHATSAPP_FROM?.trim()
  );
  const dialog360Configured = Boolean(
    process.env.WHATSAPP_360DIALOG_API_KEY?.trim()
  );
  const smsOnlyConfigured = Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_SMS_FROM?.trim()
  );

  return {
    supabaseConfigured: isSupabaseConfigured(),
    googleConfigured: Boolean(
      process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true" ||
        process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_ENABLED === "true"
    ),
    appleConfigured: Boolean(
      process.env.NEXT_PUBLIC_APPLE_AUTH_ENABLED === "true" ||
        process.env.SUPABASE_AUTH_EXTERNAL_APPLE_ENABLED === "true"
    ),
    /** WhatsApp OTP delivery ready (Meta / Twilio WA / 360dialog). */
    whatsappConfigured:
      metaConfigured || twilioWaConfigured || dialog360Configured,
    whatsappProvider:
      process.env.WHATSAPP_PROVIDER?.trim().toLowerCase() || "auto",
    /** @deprecated Use whatsappConfigured — kept for older admin UI */
    smsConfigured:
      metaConfigured ||
      twilioWaConfigured ||
      dialog360Configured ||
      smsOnlyConfigured,
    emailConfigured: isCustomerAuthEmailReady(),
  };
}
