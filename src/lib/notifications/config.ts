import {
  getEmailRuntimeSync,
  getEmailRuntime,
} from "@/lib/notifications/email-provider";

export function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

/** Master notifications switch (env + email provider enabled). */
export function isNotificationsEnabled() {
  const flag = process.env.NOTIFICATIONS_ENABLED?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  return getEmailRuntimeSync().enabled;
}

/**
 * True when Resend credentials exist (admin DB or env) and mode is resend.
 * Local outbox mode returns false — use canAttemptEmail() for send attempts.
 */
export function isResendConfigured() {
  const r = getEmailRuntimeSync();
  return (
    r.enabled &&
    r.mode === "resend" &&
    Boolean(r.apiKey?.trim() && r.fromEmail?.trim())
  );
}

/** True when sendEmail can accept a message (local outbox or Resend). */
export function canAttemptEmail() {
  const r = getEmailRuntimeSync();
  if (!r.enabled) return false;
  if (r.mode === "local") return true;
  return Boolean(r.apiKey?.trim() && r.fromEmail?.trim());
}

export function isWhatsAppConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_WHATSAPP_FROM?.trim()
  );
}

export function getAdminNotificationEmail() {
  return (
    getEmailRuntimeSync().adminNotificationEmail ||
    process.env.ADMIN_NOTIFICATION_EMAIL?.trim() ||
    process.env.BOUTIQUE_ADMIN_EMAIL?.trim() ||
    ""
  );
}

/** FROM address — admin settings override env. */
export function getResendFrom() {
  return getEmailRuntimeSync().fromEmail;
}

export function isResendSandboxFrom() {
  return getEmailRuntimeSync().fromIsSandbox;
}

/**
 * Customer auth mail only when Resend can reach arbitrary inboxes
 * (verified-domain FROM). Warm cache with getEmailRuntime() in request paths.
 */
export function isCustomerAuthEmailReady() {
  return getEmailRuntimeSync().deliveryReady;
}

export async function refreshEmailRuntime() {
  return getEmailRuntime(true);
}

export function getReplyToEmail() {
  return getEmailRuntimeSync().replyTo;
}

export function getBoutiquePhone() {
  return process.env.NEXT_PUBLIC_BOUTIQUE_PHONE?.trim() || "0525999010";
}

export function getBoutiqueEmail() {
  return (
    process.env.NEXT_PUBLIC_BOUTIQUE_EMAIL?.trim() || "hello@nadeendesigns.com"
  );
}

export function getDefaultSenderName() {
  return getEmailRuntimeSync().fromName || "Nadeen Designs";
}

export const NOTIFICATION_MAX_ATTEMPTS = 3;
