import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRouteHandlerClient } from "@/lib/supabase/route";
import { getCustomerAuthSettings } from "@/lib/customer-auth/settings";
import {
  recordLoginHistory,
  upsertCustomerForAuthUser,
} from "@/lib/customer-auth/customer";
import { sendCustomerAuthLinkEmail } from "@/lib/customer-auth/auth-mail";
import { isCustomerAuthEmailReady } from "@/lib/notifications/config";
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
  if (
    m.includes("email rate limit") ||
    m.includes("over_email_send_rate_limit")
  ) {
    return (
      "تعذّر إرسال بريد التأكيد (حد إرسال Supabase). " +
      "ثبّتي نطاقاً في Resend وغيّري FROM_EMAIL — أو حاولي بعد ساعة."
    );
  }
  if (
    (m.includes("security purposes") && m.includes("after")) ||
    m.includes("too many")
  ) {
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

    // ——— Forgot password (Resend delivery — not Supabase SMTP) ———
    if (mode === "forgot") {
      if (!email.includes("@")) {
        return NextResponse.json(
          { error: "أدخلي بريداً إلكترونياً صالحاً" },
          { status: 400 }
        );
      }

      const result = await sendCustomerAuthLinkEmail({
        kind: "recovery",
        email,
        next: "/account/reset-password",
      });

      if (!result.ok) {
        return NextResponse.json(
          {
            error: result.error,
            ...(result.debugLink ? { debug_link: result.debugLink } : {}),
          },
          { status: 502 }
        );
      }

      if (!result.delivered && result.reason === "no_user") {
        return NextResponse.json(
          {
            ok: false,
            error: result.message,
            no_account: true,
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ok: true,
        sent: true,
        message:
          "أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدكِ. تحققي من الوارد والبريد غير الهام.",
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

      /**
       * Never use auth.signUp() here — it forces Supabase to send a
       * confirmation email and fails hard when the project email quota is hit
       * ("محاولات كثيرة"). Create the user with the admin API (no mail), then
       * deliver confirmation via Resend. If mail cannot be delivered, confirm
       * the account so signup is never blocked.
       */
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
        return NextResponse.json(
          {
            error:
              "إنشاء الحساب غير مُعدّ بالكامل (SUPABASE_SERVICE_ROLE_KEY مفقود).",
          },
          { status: 503 }
        );
      }

      const admin = createAdminClient();
      const mailReady = isCustomerAuthEmailReady();

      // Until Resend has a verified-domain FROM, never ask customers to
      // "check email" — create an already-confirmed account and sign them in.
      const { data: created, error: createError } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: !mailReady,
          user_metadata: {
            is_customer: true,
            full_name: fullName,
          },
        });

      if (createError || !created.user) {
        return NextResponse.json(
          {
            error: mapAuthError(
              createError?.message || "تعذّر إنشاء الحساب",
              mode
            ),
          },
          {
            status:
              createError?.message?.toLowerCase().includes("already") ||
              createError?.message?.toLowerCase().includes("registered")
                ? 409
                : 400,
          }
        );
      }

      await upsertCustomerForAuthUser({
        authUserId: created.user.id,
        email,
        fullName,
        provider: "email",
        guestId,
      });

      if (mailReady) {
        const mail = await sendCustomerAuthLinkEmail({
          kind: "magiclink",
          email,
          next: "/account",
        });

        if (mail.ok && mail.delivered) {
          return NextResponse.json({
            ok: true,
            needs_email_confirm: true,
            message:
              "تم إنشاء الحساب وأرسلنا رابط التأكيد إلى بريدكِ. افتحيه ثم سجّلي الدخول.",
            user: { id: created.user.id, email: created.user.email },
          });
        }

        // Resend was configured but send failed — activate account anyway.
        await admin.auth.admin.updateUserById(created.user.id, {
          email_confirm: true,
        });
      }

      const { data: signedIn, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (signInError || !signedIn.user) {
        return NextResponse.json({
          ok: true,
          needs_email_confirm: false,
          message:
            "تم إنشاء حسابكِ بنجاح. سجّلي الدخول بنفس البريد وكلمة المرور.",
          user: { id: created.user.id, email: created.user.email },
        });
      }

      await recordLoginHistory({
        authUserId: signedIn.user.id,
        method: "email",
        success: true,
        ip,
        userAgent: ua,
      });

      return applyAuthCookies(
        NextResponse.json({
          ok: true,
          needs_email_confirm: false,
          message: "تم إنشاء حسابكِ وتسجيل دخولكِ بنجاح.",
          user: {
            id: signedIn.user.id,
            email: signedIn.user.email,
          },
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
