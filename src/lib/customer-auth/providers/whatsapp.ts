import type { AuthProvider } from "./types";

/**
 * WhatsApp OTP — module kept for future plug-in.
 * Phase G: NOT an active primary login. LoginModal shows a reserved “قريباً” slot.
 * Delivery code remains under `../whatsapp` for later activation without
 * changing customer upsert / session / merge business logic.
 */
export const WhatsAppAuthProvider: AuthProvider = {
  id: "whatsapp",
  label: { ar: "المتابعة مع واتساب", en: "Continue with WhatsApp" },
  capabilities: ["otp"],
  order: 40,
  primary: true,
  comingSoon: true,
  endpoints: {
    sendOtp: "/api/auth/whatsapp/send-code",
    verifyOtp: "/api/auth/whatsapp/verify-code",
  },

  enabled() {
    // Reserved — do not ship as active login until product enables Phase WhatsApp.
    return false;
  },

  ready() {
    return false;
  },
};
