import type { AuthProvider } from "./types";

/**
 * Email/password — primary login path (order overridden by Admin channels).
 * Kept modular so it does not hardcode into session/customer core.
 */
export const EmailAuthProvider: AuthProvider = {
  id: "email",
  label: { ar: "البريد وكلمة المرور", en: "Email and password" },
  capabilities: ["password"],
  order: 10,
  primary: true,
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
