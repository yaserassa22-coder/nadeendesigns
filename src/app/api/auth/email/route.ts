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

type EmailMode = "signin" | "signup" | "forgot" | "update_password";

function mapAuthError(message: string, mode: EmailMode): string {
  const m = message.toLowerCase();
  if (
    m.includes("already registered") ||
    m.includes("already been registered") ||
    m.includes("user already exists")
  ) {
    return "هذا البريد مسجّل مسبقاً — جرّبي تسجيل الدخول أو استعادة كلمة المرور";
  }
  if (m.includes("email not confirmed") || m.includes("not confirmed")) {
    return "يجب تأكيد البريد أولاً — تحققي من صندوق الوارد";
  }
  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return "البريد أو كلمة المرور غير صحيحة";
  }
  if (m.includes("password") && (m.includes("weak") || m.includes("least"))) {
    return "كلمة المرور ضعيفة — استخدمي 6 أحرف على الأقل";
  }
  if (m.includes("rate") || m.includes("too many")) {
    return "محاولات كثيرة — حاولي لاحقاً";
  }
  if (mode === "forgot") {
    return "تعذّر إرسال رابط الاستعادة. حاولي مرة أخرى.";
  }
  if (mode === "update_password") {
    return "تعذّر تحديث كلمة المرور. حاولي مرة أخرى.";
  }
  return message || "فشل العملية";
}

/** Email + password: sign-in, sign-up, forgot password, update password. */
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
      mode?: EmailMode;
      email?: string;
      password?: string;
      full_name?: string;
    };

    const mode: EmailMode =
      body.mode === "signup" ||
      body.mode === "forgot" ||
      body.mode === "update_password"
        ? body.mode
        : "signin";

    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const { supabase, applyAuthCookies } = createRouteHandlerClient(request);
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ua = request.headers.get("user-agent");
    const guestId = readGuestIdFromRequest(request);

    // ——— Forgot password ———
    if (mode === "forgot") {
      if (!email.includes("@")) {
        return NextResponse.json(
          { error: "أدخلي بريداً إلكترونياً صالحاً" },
          { status: 400 }
        );
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getAuthCallbackUrl("/account/reset-password"),
      });
      if (error) {
        // Still return generic success to avoid email enumeration,
        // but log for debugging.
        console.warn("[auth/email] resetPasswordForEmail", error.message);
      }
      return NextResponse.json({
        ok: true,
        sent: true,
        message:
          "إن وُجد حساب بهذا البريد، ستصلكِ رسالة برابط إعادة تعيين كلمة المرور.",
      });
    }

    // ——— Update password (after recovery link session) ———
    if (mode === "update_password") {
      if (password.length < 6) {
        return NextResponse.json(
          { error: "كلمة المرور من 6 أحرف على الأقل" },
          { status: 400 }
        );
      }
      const {
        data: { user: current },
      } = await supabase.auth.getUser();
      if (!current) {
        return NextResponse.json(
          { error: "انتهت صلاحية الرابط — اطلبِي رابطاً جديداً" },
          { status: 401 }
        );
      }
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) {
        return NextResponse.json(
          { error: mapAuthError(error.message, mode) },
          { status: 400 }
        );
      }
      return applyAuthCookies(
        NextResponse.json({
          ok: true,
          user: data.user
            ? { id: data.user.id, email: data.user.email }
            : null,
        })
      );
    }

    // ——— Sign-in / Sign-up ———
    if (!email.includes("@") || password.length < 6) {
      return NextResponse.json(
        { error: "بريداً صالحاً وكلمة مرور من 6 أحرف على الأقل" },
        { status: 400 }
      );
    }

    if (mode === "signup") {
      const fullName = (body.full_name || "").trim();
      if (fullName.length < 2) {
        return NextResponse.json(
          { error: "أدخلي الاسم الكامل (حرفان على الأقل)" },
          { status: 400 }
        );
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            is_customer: true,
            full_name: fullName,
          },
          emailRedirectTo: getAuthCallbackUrl("/account"),
        },
      });
      if (error) {
        return NextResponse.json(
          { error: mapAuthError(error.message, mode) },
          { status: 400 }
        );
      }

      // Supabase may return a user with empty identities when email already exists
      // and confirmations are on (anti-enumeration). Treat as already registered.
      const identities = data.user?.identities;
      if (data.user && Array.isArray(identities) && identities.length === 0) {
        return NextResponse.json(
          {
            error:
              "هذا البريد مسجّل مسبقاً — جرّبي تسجيل الدخول أو استعادة كلمة المرور",
          },
          { status: 409 }
        );
      }

      const needsConfirm = !data.session;
      if (data.user && data.session) {
        await upsertCustomerForAuthUser({
          authUserId: data.user.id,
          email,
          fullName,
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
      } else if (data.user && needsConfirm) {
        // Provision customer row early so confirm callback can merge guest cart.
        await upsertCustomerForAuthUser({
          authUserId: data.user.id,
          email,
          fullName,
          provider: "email",
          guestId,
        });
      }

      return applyAuthCookies(
        NextResponse.json({
          ok: true,
          needs_email_confirm: needsConfirm,
          message: needsConfirm
            ? "تم إنشاء الحساب. تحققي من بريدك لتأكيد الحساب، ثم سجّلي الدخول."
            : undefined,
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
        { error: mapAuthError(error.message, "signin") },
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
