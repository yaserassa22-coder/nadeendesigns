import type { AuthProvider } from "./types";

/**
 * WhatsApp OTP — module kept for future plug-in.
 * Coming-soon / enable / order come from Admin → customer_auth.channels.
 * Delivery code remains under `../whatsapp` for activation without
 * changing customer upsert / session / merge business logic.
 */
export const WhatsAppAuthProvider: AuthProvider = {
  id: "whatsapp",
  label: { ar: "المتابعة مع واتساب", en: "Continue with WhatsApp" },
  capabilities: ["otp"],
  order: 50,
  primary: true,
  comingSoon: true,
  endpoints: {
    sendOtp: "/api/auth/whatsapp/send-code",
    verifyOtp: "/api/auth/whatsapp/verify-code",
  },

  enabled(settings) {
    return settings.otp_enabled !== false;
  },

  ready(_settings, flags) {
    return Boolean(flags.whatsappConfigured);
  },
};
