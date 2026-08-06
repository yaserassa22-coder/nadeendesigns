export function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function isNotificationsEnabled() {
  const flag = process.env.NOTIFICATIONS_ENABLED?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  return true;
}

export function isResendConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && getResendFrom()
  );
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
    process.env.ADMIN_NOTIFICATION_EMAIL?.trim() ||
    process.env.BOUTIQUE_ADMIN_EMAIL?.trim() ||
    ""
  );
}

/** FROM address — prefer FROM_EMAIL, fall back to RESEND_FROM_EMAIL. */
export function getResendFrom() {
  const explicit =
    process.env.FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "";
  if (explicit) return explicit;
  // Local/dev convenience when only the API key is set (Resend test sender).
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.RESEND_API_KEY?.trim()
  ) {
    return "beth.t@example.com";
  }
  return "";
}

/** Optional Reply-To for outbound mail (admin replies, notifications). */
export function getReplyToEmail() {
  return (
    process.env.REPLY_TO_EMAIL?.trim() ||
    process.env.RESEND_REPLY_TO_EMAIL?.trim() ||
    ""
  );
}

export function getBoutiquePhone() {
  return process.env.NEXT_PUBLIC_BOUTIQUE_PHONE?.trim() || "0525999010";
}

export function getBoutiqueEmail() {
  return (
    process.env.NEXT_PUBLIC_BOUTIQUE_EMAIL?.trim() || "hello@nadeendesigns.com"
  );
}

/** Prefer notification settings when available; env as fallback */
export function getDefaultSenderName() {
  return process.env.NOTIFICATION_SENDER_NAME?.trim() || "Nadeen Designs";
}

export const NOTIFICATION_MAX_ATTEMPTS = 3;
