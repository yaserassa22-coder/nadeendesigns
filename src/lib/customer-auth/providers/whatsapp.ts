import type { AuthProvider } from "./types";

/**
 * WhatsApp OTP auth — delivery stays in `../whatsapp` (Meta/Twilio/360dialog).
 * Session + customer upsert use shared provider-agnostic services;
 * this module only owns OTP send/verify endpoints and the `whatsapp` provider id.
 */
export const WhatsAppAuthProvider: AuthProvider = {
  id: "whatsapp",
  label: { ar: "المتابعة مع واتساب", en: "Continue with WhatsApp" },
  capabilities: ["otp"],
  order: 10,
  primary: true,
  endpoints: {
    sendOtp: "/api/auth/whatsapp/send-code",
    verifyOtp: "/api/auth/whatsapp/verify-code",
  },

  enabled(settings, flags) {
    return settings.otp_enabled !== false && flags.supabaseConfigured;
  },

  ready(settings) {
    // UI can open OTP flow when setting enabled; delivery may use DEV fallback.
    return settings.otp_enabled !== false;
  },
};
