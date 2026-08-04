import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  generateOtpCode,
  hashOtpCode,
  toE164,
} from "@/lib/customer-auth/otp";
import { deliverPhoneOtp } from "@/lib/customer-auth/sms";
import {
  getAuthEnvFlags,
  getCustomerAuthSettings,
} from "@/lib/customer-auth/settings";

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "خدمة المصادقة غير مُعدّة" },
        { status: 503 }
      );
    }

    const settings = await getCustomerAuthSettings();
    if (!settings.otp_enabled) {
      return NextResponse.json(
        { error: "تسجيل الدخول بالهاتف غير مفعّل حالياً" },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      dial?: string;
      phone?: string;
      remember?: boolean;
    };

    const dial = (body.dial || "+972").trim();
    const phone = (body.phone || "").trim();
    const e164 = toE164(dial, phone);
    if (!e164) {
      return NextResponse.json(
        { error: "رقم الهاتف غير صالح" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const ua = request.headers.get("user-agent");

    // Rate limit: max 3 OTP sends per destination per 15 minutes
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: recent, error: recentErr } = await supabase
      .from("otp_requests")
      .select("id, created_at")
      .eq("destination", e164)
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    if (recentErr && !isMissingTableError(recentErr, "otp_requests")) {
      return NextResponse.json(
        { error: "تعذّر التحقق من الحد. طبّقي ترحيل 028 أولاً." },
        { status: 503 }
      );
    }

    if ((recent?.length ?? 0) >= 3) {
      return NextResponse.json(
        { error: "تم تجاوز حد الإرسال. حاولي بعد قليلاً." },
        { status: 429 }
      );
    }

    // Resend cooldown
    const last = recent?.[0];
    if (last?.created_at) {
      const elapsed =
        Date.now() - new Date(last.created_at as string).getTime();
      const wait = settings.otp_resend_seconds * 1000 - elapsed;
      if (wait > 0) {
        return NextResponse.json(
          {
            error: `انتظري ${Math.ceil(wait / 1000)} ثانية قبل إعادة الإرسال`,
            retry_after: Math.ceil(wait / 1000),
          },
          { status: 429 }
        );
      }
    }

    const code = generateOtpCode();
    const expiresAt = new Date(
      Date.now() + settings.otp_expiration_seconds * 1000
    ).toISOString();

    const { data: row, error: insertErr } = await supabase
      .from("otp_requests")
      .insert({
        channel: "phone",
        destination: e164,
        code_hash: hashOtpCode(code),
        attempts: 0,
        max_attempts: settings.otp_max_attempts,
        expires_at: expiresAt,
        ip_address: ip,
        user_agent: ua,
      })
      .select("id")
      .single();

    if (insertErr) {
      if (isMissingTableError(insertErr, "otp_requests")) {
        return NextResponse.json(
          {
            error:
              "جداول مصادقة العملاء غير موجودة. نفّذي supabase/APPLY_CUSTOMER_AUTH.sql",
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: insertErr.message || "فشل إنشاء الرمز" },
        { status: 500 }
      );
    }

    const delivered = await deliverPhoneOtp({ to: e164, code });
    if (!delivered.ok) {
      return NextResponse.json({ error: delivered.error }, { status: 503 });
    }

    const flags = getAuthEnvFlags();
    const payload: Record<string, unknown> = {
      ok: true,
      request_id: row.id,
      expires_in: settings.otp_expiration_seconds,
      resend_in: settings.otp_resend_seconds,
      channel: delivered.channel,
      destination_hint: `${e164.slice(0, 4)}•••${e164.slice(-3)}`,
      sms_configured: flags.smsConfigured,
    };

    if (delivered.channel === "dev") {
      payload.dev_code = code;
    }

    return NextResponse.json(payload);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
