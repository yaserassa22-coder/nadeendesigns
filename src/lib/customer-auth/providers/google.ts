import type { AuthProvider } from "./types";
import { createClient } from "@/lib/supabase/server";

export const GoogleAuthProvider: AuthProvider = {
  id: "google",
  label: { ar: "المتابعة مع Google", en: "Continue with Google" },
  capabilities: ["oauth"],
  order: 30,
  primary: true,
  endpoints: { oauth: "/api/auth/oauth" },

  enabled(settings, flags) {
    return settings.google_enabled !== false && flags.supabaseConfigured;
  },

  ready(_settings, flags) {
    return flags.googleConfigured;
  },

  async startOAuth({ redirectTo }) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      return {
        ok: false,
        error:
          error?.message ||
          "تعذّر بدء تسجيل الدخول. تحققي من إعدادات OAuth في Supabase.",
        status: 503,
        configured: false,
      };
    }

    return { ok: true, url: data.url };
  },
};
