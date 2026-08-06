import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createRouteHandlerClient } from "@/lib/supabase/route";
import { getCustomerAuthSettings } from "@/lib/customer-auth/settings";
import {
  recordLoginHistory,
  upsertCustomerForAuthUser,
} from "@/lib/customer-auth/customer";
import { getAuthCallbackUrl } from "@/lib/customer-auth/callback-url";
import { readGuestIdFromRequest } from "@/lib/guest";

/** Email + password sign-in / sign-up (optional path). */
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "خدمة المصادقة غير مُعدّة" },
        { status: 503 }
      );
    }

    const settings = await getCustomerAuthSettings();
    if (!settings.email_password_enabled) {
      return NextResponse.json(
        { error: "تسجيل الدخول بالبريد غير مفعّل" },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      mode?: "signin" | "signup";
      email?: string;
      password?: string;
      full_name?: string;
    };

    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    if (!email.includes("@") || password.length < 6) {
      return NextResponse.json(
        { error: "بريداً صالحاً وكلمة مرور من 6 أحرف على الأقل" },
        { status: 400 }
      );
    }

    const { supabase, applyAuthCookies } = createRouteHandlerClient(request);
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ua = request.headers.get("user-agent");
    const mode = body.mode === "signup" ? "signup" : "signin";
    const guestId = readGuestIdFromRequest(request);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            is_customer: true,
            full_name: body.full_name || "",
          },
          emailRedirectTo: getAuthCallbackUrl("/account"),
        },
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (data.user) {
        await upsertCustomerForAuthUser({
          authUserId: data.user.id,
          email,
          fullName: body.full_name,
          provider: "email",
          guestId,
        });
        await recordLoginHistory({
          authUserId: data.user.id,
          method: "email",
          success: true,
          ip,
          userAgent: ua,
        });
      }
      return applyAuthCookies(
        NextResponse.json({
          ok: true,
          needs_email_confirm: !data.session,
          user: data.user
            ? { id: data.user.id, email: data.user.email }
            : null,
        })
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      await recordLoginHistory({
        method: "email",
        success: false,
        ip,
        userAgent: ua,
        meta: { email },
      });
      return NextResponse.json(
        { error: "البريد أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    if (data.user) {
      await upsertCustomerForAuthUser({
        authUserId: data.user.id,
        email,
        fullName: body.full_name,
        provider: "email",
        guestId,
      });
      await recordLoginHistory({
        authUserId: data.user.id,
        method: "email",
        success: true,
        ip,
        userAgent: ua,
      });
    }

    return applyAuthCookies(
      NextResponse.json({
        ok: true,
        user: data.user
          ? { id: data.user.id, email: data.user.email }
          : null,
      })
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
