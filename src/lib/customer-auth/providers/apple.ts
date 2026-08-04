import type { AuthProvider } from "./types";
import { createClient } from "@/lib/supabase/server";

export const AppleAuthProvider: AuthProvider = {
  id: "apple",
  label: { ar: "المتابعة مع Apple", en: "Continue with Apple" },
  capabilities: ["oauth"],
  order: 30,
  primary: true,
  endpoints: { oauth: "/api/auth/oauth" },

  enabled(settings, flags) {
    return settings.apple_enabled !== false && flags.supabaseConfigured;
  },

  ready(_settings, flags) {
    return flags.appleConfigured;
  },

  async startOAuth({ redirectTo }) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
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
