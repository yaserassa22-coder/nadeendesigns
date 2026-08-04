import type { AuthProvider } from "./types";

/**
 * Optional email/password path — secondary (not primary UX).
 * Kept modular so it does not hardcode into session/customer core.
 */
export const EmailAuthProvider: AuthProvider = {
  id: "email",
  label: { ar: "البريد وكلمة المرور", en: "Email and password" },
  capabilities: ["password"],
  order: 50,
  primary: false,
  endpoints: { password: "/api/auth/email" },

  enabled(settings, flags) {
    return (
      settings.email_password_enabled !== false && flags.supabaseConfigured
    );
  },

  ready(settings) {
    return settings.email_password_enabled !== false;
  },
};
