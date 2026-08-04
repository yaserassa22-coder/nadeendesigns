import type { AuthProvider } from "./types";

/**
 * Guest browsing / checkout — no server session.
 * Client sets guest mode; checkout may create a guest customer row
 * via shared upsert helpers (provider id = "guest").
 */
export const GuestAuthProvider: AuthProvider = {
  id: "guest",
  label: { ar: "المتابعة كزائرة", en: "Continue as guest" },
  capabilities: ["guest"],
  order: 30,
  primary: true,

  enabled(settings) {
    return settings.guest_checkout_enabled !== false;
  },

  ready() {
    return true;
  },
};
