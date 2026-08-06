import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  getAuthCallbackUrl,
  safeAuthNextPath,
} from "@/lib/customer-auth/callback-url";
import {
  getAuthEnvFlags,
  getCustomerAuthSettings,
} from "@/lib/customer-auth/settings";
import {
  ensureAuthProvidersRegistered,
  getAuthProvider,
} from "@/lib/customer-auth/providers";

/**
 * Start OAuth for any registered oauth-capable auth provider.
 * Provider-specific logic lives in the provider module — not here.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase غير مُعد", configured: false },
        { status: 503 }
      );
    }

    ensureAuthProvidersRegistered();

    const body = (await request.json().catch(() => ({}))) as {
      provider?: string;
      next?: string;
    };
    const providerId = (body.provider || "").trim();
    const authProvider = getAuthProvider(providerId);

    if (!authProvider || !authProvider.capabilities.includes("oauth")) {
      return NextResponse.json({ error: "مزوّد غير مدعوم" }, { status: 400 });
    }

    if (!authProvider.startOAuth) {
      return NextResponse.json(
        { error: "هذا المزوّد لا يدعم OAuth" },
        { status: 400 }
      );
    }

    const settings = await getCustomerAuthSettings();
    const flags = getAuthEnvFlags();

    if (!authProvider.enabled(settings, flags)) {
      return NextResponse.json(
        {
          error: `${authProvider.label.ar} غير مفعّل`,
          configured: false,
        },
        { status: 403 }
      );
    }

    if (!authProvider.ready(settings, flags)) {
      return NextResponse.json(
        {
          error: `${authProvider.label.ar} غير مُعد. تحققي من إعدادات البيئة وSupabase.`,
          configured: false,
        },
        { status: 503 }
      );
    }

    const next = safeAuthNextPath(body.next, "/account");
    const redirectTo = getAuthCallbackUrl(next);

    const result = await authProvider.startOAuth({ next, redirectTo });
    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          configured: result.configured ?? false,
        },
        { status: result.status }
      );
    }

    return NextResponse.json({ ok: true, url: result.url, configured: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
