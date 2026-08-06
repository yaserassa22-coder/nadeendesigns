/**
 * Admin-manageable email transport (Resend).
 * Secrets may be stored server-side in settings JSON; never returned in full to the client.
 */

export type EmailDeliveryMode = "resend" | "local";

export interface EmailProviderSettings {
  /** Master switch for outbound email (also respects store.notifications.email_enabled). */
  enabled: boolean;
  /** resend = live/sandbox API; local = save to outbox without sending (dev / pre-domain). */
  mode: EmailDeliveryMode;
  from_email: string;
  from_name: string;
  reply_to: string;
  admin_notification_email: string;
  /**
   * Resend API key. Empty string = fall back to process.env.RESEND_API_KEY.
   * Never expose the raw value to the browser — use has_api_key + masked preview.
   */
  resend_api_key: string;
}

/** Safe payload for Admin UI (no full API key). */
export interface EmailProviderPublicStatus {
  settings: Omit<EmailProviderSettings, "resend_api_key">;
  has_api_key: boolean;
  api_key_source: "admin" | "env" | "none";
  api_key_preview: string | null;
  from_is_sandbox: boolean;
  /** True when Resend can deliver to arbitrary customer inboxes (non-sandbox FROM + key). */
  delivery_ready: boolean;
  /** Human status for the admin banner. */
  status: "ready" | "sandbox" | "local" | "disabled" | "not_configured";
  status_message_ar: string;
  env_fallback_available: boolean;
}

export const DEFAULT_EMAIL_PROVIDER_SETTINGS: EmailProviderSettings = {
  enabled: true,
  mode: "local",
  from_email: "",
  from_name: "Nadeen Designs",
  reply_to: "",
  admin_notification_email: "",
  resend_api_key: "",
};

export const EMAIL_PROVIDER_SETTINGS_KEY = "email_provider";
