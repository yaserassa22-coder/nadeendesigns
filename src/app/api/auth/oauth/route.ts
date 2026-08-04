import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSiteUrl } from "@/lib/notifications/config";
import {
  getAuthEnvFlags,
  getCustomerAuthSettings,
} from "@/lib/customer-auth/settings";

/**
 * Returns OAuth start URL for Google/Apple via Supabase.
 * Client redirects to `url`. Buttons stay visible; disabled when not configured.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase غير مُعد", configured: false },
        { status: 503 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      provider?: "google" | "apple";
      next?: string;
    };
    const provider = body.provider;
    if (provider !== "google" && provider !== "apple") {
      return NextResponse.json({ error: "مزوّد غير مدعوم" }, { status: 400 });
    }

    const settings = await getCustomerAuthSettings();
    const flags = getAuthEnvFlags();

    if (provider === "google") {
      if (!settings.google_enabled) {
        return NextResponse.json(
          { error: "تسجيل Google غير مفعّل", configured: false },
          { status: 403 }
        );
      }
      if (!flags.googleConfigured) {
        return NextResponse.json(
          {
            error:
              "Google غير مُعد. فعّلي المزود في Supabase وضعي NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true",
            configured: false,
          },
          { status: 503 }
        );
      }
    }

    if (provider === "apple") {
      if (!settings.apple_enabled) {
        return NextResponse.json(
          { error: "تسجيل Apple غير مفعّل", configured: false },
          { status: 403 }
        );
      }
      if (!flags.appleConfigured) {
        return NextResponse.json(
          {
            error:
              "Apple غير مُعد. فعّلي المزود في Supabase وضعي NEXT_PUBLIC_APPLE_AUTH_ENABLED=true",
            configured: false,
          },
          { status: 503 }
        );
      }
    }

    const next =
      body.next?.startsWith("/") && !body.next.startsWith("//")
        ? body.next
        : "/account";
    const redirectTo = `${getSiteUrl()}/api/auth/callback?next=${encodeURIComponent(next)}`;

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      return NextResponse.json(
        {
          error:
            error?.message ||
            "تعذّر بدء تسجيل الدخول. تحققي من إعدادات OAuth في Supabase.",
          configured: false,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true, url: data.url, configured: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
