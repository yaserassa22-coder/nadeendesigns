import {
  DEFAULT_AUTH_CHANNELS,
  DEFAULT_CUSTOMER_AUTH_SETTINGS,
  type AuthChannelSettings,
  type CustomerAuthSettings,
} from "@/types/customer-auth";
import { isCustomerAuthEmailReady } from "@/lib/notifications/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

let cached: CustomerAuthSettings | null = null;
let cachedAt = 0;
const CACHE_MS = 30_000;

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeChannel(
  raw: unknown,
  fallback: AuthChannelSettings
): AuthChannelSettings {
  const src = asObject(raw);
  const envRefs = Array.isArray(src.secret_env_refs)
    ? (src.secret_env_refs as unknown[]).filter(
        (x): x is string => typeof x === "string"
      )
    : fallback.secret_env_refs;
  return {
    id: str(src.id, fallback.id),
    enabled: bool(src.enabled, fallback.enabled),
    coming_soon: bool(src.coming_soon, fallback.coming_soon),
    sort_order: Math.floor(num(src.sort_order, fallback.sort_order)),
    label_ar: str(src.label_ar, fallback.label_ar),
    label_en: str(src.label_en, fallback.label_en),
    configuration: {
      ...fallback.configuration,
      ...asObject(src.configuration),
    },
    configured: bool(src.configured, fallback.configured),
    secret_env_refs: envRefs.length ? envRefs : fallback.secret_env_refs,
    admin_notes_ar: str(src.admin_notes_ar, fallback.admin_notes_ar),
  };
}

/** Merge channel arrays by id; keep defaults + any custom admin rows. */
export function normalizeAuthChannels(raw: unknown): AuthChannelSettings[] {
  const list = Array.isArray(raw) ? raw : [];
  const byId = new Map<string, unknown>();
  for (const item of list) {
    const id = str(asObject(item).id, "");
    if (id) byId.set(id, item);
  }

  const merged = DEFAULT_AUTH_CHANNELS.map((def) =>
    normalizeChannel(byId.get(def.id) ?? def, def)
  );

  for (const item of list) {
    const id = str(asObject(item).id, "");
    if (!id || DEFAULT_AUTH_CHANNELS.some((d) => d.id === id)) continue;
    merged.push(
      normalizeChannel(item, {
        id,
        enabled: false,
        coming_soon: true,
        sort_order: 100 + merged.length,
        label_ar: id,
        label_en: id,
        configuration: {},
        configured: false,
        secret_env_refs: [],
        admin_notes_ar: "",
      })
    );
  }

  return merged.sort((a, b) => a.sort_order - b.sort_order);
}

/** Keep legacy boolean toggles in sync with channels (backward compatible APIs). */
function syncLegacyTogglesFromChannels(
  settings: CustomerAuthSettings
): CustomerAuthSettings {
  const byId = Object.fromEntries(settings.channels.map((c) => [c.id, c]));
  return {
    ...settings,
    email_password_enabled: byId.email?.enabled ?? settings.email_password_enabled,
    guest_checkout_enabled: byId.guest?.enabled ?? settings.guest_checkout_enabled,
    google_enabled: byId.google?.enabled ?? settings.google_enabled,
    apple_enabled: byId.apple?.enabled ?? settings.apple_enabled,
    otp_enabled: byId.whatsapp
      ? byId.whatsapp.enabled && !byId.whatsapp.coming_soon
      : settings.otp_enabled,
    facebook_enabled: byId.facebook?.enabled ?? settings.facebook_enabled,
  };
}

/**
 * When older clients save only legacy toggles, push those onto channels.
 */
function applyLegacyTogglesToChannels(
  channels: AuthChannelSettings[],
  src: Partial<CustomerAuthSettings>
): AuthChannelSettings[] {
  const patchEnabled: Record<string, boolean | undefined> = {
    email: src.email_password_enabled,
    guest: src.guest_checkout_enabled,
    google: src.google_enabled,
    apple: src.apple_enabled,
    whatsapp: src.otp_enabled,
    facebook: src.facebook_enabled,
  };

  return channels.map((ch) => {
    const next = patchEnabled[ch.id];
    if (typeof next !== "boolean") return ch;
    // WhatsApp: legacy otp_enabled=false keeps قريباً; otp_enabled=true alone
    // must NOT clear coming_soon (Phase G reserved slot) — only Admin channel edit does.
    if (ch.id === "whatsapp") {
      if (next === false) {
        return { ...ch, coming_soon: true };
      }
      return ch;
    }
    return { ...ch, enabled: next };
  });
}

export function mergeCustomerAuthSettings(
  value?: Partial<CustomerAuthSettings> | null
): CustomerAuthSettings {
  const src = value ?? {};
  const hasChannelsArray = Array.isArray(src.channels);

  let channels = normalizeAuthChannels(
    hasChannelsArray ? src.channels : DEFAULT_AUTH_CHANNELS
  );

  // If payload only updated legacy flags (Store Settings auth section),
  // reflect them onto channel rows.
  if (!hasChannelsArray) {
    channels = applyLegacyTogglesToChannels(channels, src);
  }

  const base: CustomerAuthSettings = {
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
    channels,
  };

  return syncLegacyTogglesFromChannels(base);
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
