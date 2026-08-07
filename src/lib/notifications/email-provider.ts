import {
  DEFAULT_EMAIL_PROVIDER_SETTINGS,
  EMAIL_PROVIDER_SETTINGS_KEY,
  type EmailProviderPublicStatus,
  type EmailProviderSettings,
} from "@/types/email-provider";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getStoreSettings } from "@/lib/store/settings";

let cached: EmailProviderSettings | null = null;
let cachedAt = 0;
/** True when a settings row exists in DB (admin has saved at least once). */
let cachedPersisted = false;
const CACHE_MS = 15_000;

/** Last resolved runtime for sync helpers (warmed by getEmailRuntime / sendEmail). */
let syncSnapshot: EmailRuntime | null = null;

/** Resolved transport used by sendEmail — admin DB overrides env. */
export type EmailRuntime = {
  enabled: boolean;
  mode: "resend" | "local";
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
  adminNotificationEmail: string;
  fromIsSandbox: boolean;
  deliveryReady: boolean;
};

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.trim() : fallback;
}

export function mergeEmailProviderSettings(
  value?: Partial<EmailProviderSettings> | null
): EmailProviderSettings {
  const mode =
    value?.mode === "resend" || value?.mode === "local"
      ? value.mode
      : DEFAULT_EMAIL_PROVIDER_SETTINGS.mode;

  return {
    enabled:
      typeof value?.enabled === "boolean"
        ? value.enabled
        : DEFAULT_EMAIL_PROVIDER_SETTINGS.enabled,
    mode,
    from_email: str(value?.from_email, DEFAULT_EMAIL_PROVIDER_SETTINGS.from_email),
    from_name: str(
      value?.from_name,
      DEFAULT_EMAIL_PROVIDER_SETTINGS.from_name
    ),
    reply_to: str(value?.reply_to, DEFAULT_EMAIL_PROVIDER_SETTINGS.reply_to),
    admin_notification_email: str(
      value?.admin_notification_email,
      DEFAULT_EMAIL_PROVIDER_SETTINGS.admin_notification_email
    ),
    resend_api_key: str(
      value?.resend_api_key,
      DEFAULT_EMAIL_PROVIDER_SETTINGS.resend_api_key
    ),
  };
}

export function invalidateEmailProviderCache() {
  cached = null;
  cachedAt = 0;
  cachedPersisted = false;
  syncSnapshot = null;
}

export async function getEmailProviderSettings(
  force = false
): Promise<EmailProviderSettings> {
  const now = Date.now();
  if (!force && cached && now - cachedAt < CACHE_MS) return cached;

  if (!isSupabaseConfigured()) {
    cached = DEFAULT_EMAIL_PROVIDER_SETTINGS;
    cachedPersisted = false;
    cachedAt = now;
    return cached;
  }

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", EMAIL_PROVIDER_SETTINGS_KEY)
      .maybeSingle();
    cachedPersisted = Boolean(data?.value);
    cached = mergeEmailProviderSettings(
      (data?.value as Partial<EmailProviderSettings> | null) ?? null
    );
    cachedAt = now;
    return cached;
  } catch {
    cachedPersisted = false;
    return DEFAULT_EMAIL_PROVIDER_SETTINGS;
  }
}

export async function saveEmailProviderSettings(
  value: EmailProviderSettings
): Promise<EmailProviderSettings> {
  const merged = mergeEmailProviderSettings(value);
  if (!isSupabaseConfigured()) {
    cached = merged;
    cachedPersisted = true;
    cachedAt = Date.now();
    syncSnapshot = null;
    return merged;
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from("settings").upsert({
    key: EMAIL_PROVIDER_SETTINGS_KEY,
    value: merged,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  cached = merged;
  cachedPersisted = true;
  cachedAt = Date.now();
  syncSnapshot = null;
  return merged;
}

function envOnlyRuntime(): EmailRuntime {
  const apiKey = envApiKey();
  let fromEmail = envFrom();
  if (!fromEmail && apiKey && process.env.NODE_ENV !== "production") {
    fromEmail = "beth.t@example.com";
  }
  const fromIsSandbox = isSandboxFrom(fromEmail);
  // Until async resolve: prefer local so messaging works without domain.
  // Env Resend still used after getEmailRuntime() warms (see bootstrap below).
  const mode: "resend" | "local" =
    apiKey && fromEmail && !fromIsSandbox ? "resend" : "local";
  const enabled =
    process.env.NOTIFICATIONS_ENABLED?.trim().toLowerCase() !== "false" &&
    process.env.NOTIFICATIONS_ENABLED?.trim() !== "0";
  return {
    enabled,
    mode,
    apiKey,
    fromEmail,
    fromName: process.env.NOTIFICATION_SENDER_NAME?.trim() || "Nadeen Designs",
    replyTo:
      process.env.REPLY_TO_EMAIL?.trim() ||
      process.env.RESEND_REPLY_TO_EMAIL?.trim() ||
      "",
    adminNotificationEmail:
      process.env.ADMIN_NOTIFICATION_EMAIL?.trim() ||
      process.env.BOUTIQUE_ADMIN_EMAIL?.trim() ||
      "",
    fromIsSandbox,
    // Match async deliveryReady: never treat @resend.dev as customer-ready.
    deliveryReady: Boolean(
      enabled && mode === "resend" && apiKey && fromEmail && !fromIsSandbox
    ),
  };
}

/** Sync access — prefers last async resolve, else env bootstrap. */
export function getEmailRuntimeSync(): EmailRuntime {
  return syncSnapshot ?? envOnlyRuntime();
}

function envApiKey() {
  return process.env.RESEND_API_KEY?.trim() || "";
}

function envFrom() {
  return (
    process.env.FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    ""
  );
}

function isSandboxFrom(from: string) {
  return from.toLowerCase().includes("@resend.dev");
}

export async function getEmailRuntime(force = false): Promise<EmailRuntime> {
  const [settings, store] = await Promise.all([
    getEmailProviderSettings(force),
    getStoreSettings(force).catch(() => null),
  ]);
  const apiKey = settings.resend_api_key || envApiKey();
  let fromEmail = settings.from_email || envFrom();
  // Dev convenience when key exists but FROM empty
  if (!fromEmail && apiKey && process.env.NODE_ENV !== "production") {
    fromEmail = "beth.t@example.com";
  }

  const fromIsSandbox = isSandboxFrom(fromEmail);
  // Admin-saved mode wins. Before first save:
  // verified FROM → resend; sandbox/missing → local (site messaging still works).
  let mode: "resend" | "local" =
    settings.mode === "resend" ? "resend" : "local";
  if (!cachedPersisted) {
    mode =
      apiKey && fromEmail && !fromIsSandbox ? "resend" : "local";
  }

  const notificationsEnvOff =
    process.env.NOTIFICATIONS_ENABLED?.trim().toLowerCase() === "false" ||
    process.env.NOTIFICATIONS_ENABLED?.trim() === "0";
  const storeEmailOff = store?.notifications?.email_enabled === false;
  const enabled =
    settings.enabled && !notificationsEnvOff && !storeEmailOff;

  const deliveryReady =
    enabled &&
    mode === "resend" &&
    Boolean(apiKey && fromEmail) &&
    !fromIsSandbox;

  const runtime: EmailRuntime = {
    enabled,
    mode,
    apiKey,
    fromEmail,
    fromName:
      settings.from_name ||
      process.env.NOTIFICATION_SENDER_NAME?.trim() ||
      "Nadeen Designs",
    replyTo:
      settings.reply_to ||
      process.env.REPLY_TO_EMAIL?.trim() ||
      process.env.RESEND_REPLY_TO_EMAIL?.trim() ||
      "",
    adminNotificationEmail:
      settings.admin_notification_email ||
      process.env.ADMIN_NOTIFICATION_EMAIL?.trim() ||
      process.env.BOUTIQUE_ADMIN_EMAIL?.trim() ||
      "",
    fromIsSandbox,
    deliveryReady,
  };
  syncSnapshot = runtime;
  return runtime;
}

function maskKey(key: string): string | null {
  if (!key) return null;
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 3)}••••${key.slice(-4)}`;
}

export async function getEmailProviderPublicStatus(
  force = false
): Promise<EmailProviderPublicStatus> {
  const settings = await getEmailProviderSettings(force);
  const runtime = await getEmailRuntime(force);
  const adminKey = settings.resend_api_key;
  const envKey = envApiKey();
  const has_api_key = Boolean(runtime.apiKey);
  const api_key_source: EmailProviderPublicStatus["api_key_source"] = adminKey
    ? "admin"
    : envKey
      ? "env"
      : "none";

  let status: EmailProviderPublicStatus["status"] = "not_configured";
  let status_message_ar = "البريد غير مُعد — أضيفي مفتاح Resend وعنوان المرسل.";

  if (!settings.enabled || !runtime.enabled) {
    status = "disabled";
    status_message_ar =
      "إرسال البريد متوقف (إعدادات البريد أو قنوات المتجر → الإشعارات).";
  } else if (runtime.mode === "local") {
    status = "local";
    status_message_ar =
      "وضع محلي: الرسائل تُحفظ في النظام دون إرسال خارجي. عند شراء Resend وتوثيق النطاق، وصّلي المفتاح و FROM من هنا وفعّلي وضع Resend.";
  } else if (!has_api_key || !runtime.fromEmail) {
    status = "not_configured";
    status_message_ar =
      "أدخلي مفتاح Resend API وعنوان FROM من نطاق موثّق، ثم اختبري الإرسال.";
  } else if (runtime.fromIsSandbox) {
    status = "sandbox";
    status_message_ar =
      "Resend في وضع التجربة (@resend.dev) — يصل فقط لبريد حساب Resend. بعد توثيق النطاق ضعي FROM مثل hello@yourdomain.com.";
  } else if (runtime.deliveryReady) {
    status = "ready";
    status_message_ar = "البريد جاهز لإرسال رسائل الزبونات عبر Resend.";
  }

  const safe = {
    enabled: settings.enabled,
    mode: settings.mode,
    from_email: settings.from_email,
    from_name: settings.from_name,
    reply_to: settings.reply_to,
    admin_notification_email: settings.admin_notification_email,
  };

  return {
    settings: {
      ...safe,
      // Show effective runtime mode/FROM so the form matches the banner.
      mode: runtime.mode,
      from_email: safe.from_email || runtime.fromEmail,
      from_name: safe.from_name || runtime.fromName,
      reply_to: safe.reply_to || runtime.replyTo,
      admin_notification_email:
        safe.admin_notification_email || runtime.adminNotificationEmail,
    },
    has_api_key,
    api_key_source,
    api_key_preview: maskKey(runtime.apiKey),
    from_is_sandbox: runtime.fromIsSandbox,
    delivery_ready: runtime.deliveryReady,
    status,
    status_message_ar,
    env_fallback_available: Boolean(envKey || envFrom()),
  };
}
