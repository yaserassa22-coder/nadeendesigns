import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  generateOtpCode,
  hashOtpCode,
  safeEqualHash,
  toE164,
} from "@/lib/customer-auth/otp";
import { sendWhatsAppOtp } from "@/lib/customer-auth/whatsapp";
import {
  getAuthEnvFlags,
  getCustomerAuthSettings,
} from "@/lib/customer-auth/settings";
import {
  establishPhoneSession,
  getCustomerByAuthUserId,
  recordCustomerSession,
  recordLoginHistory,
} from "@/lib/customer-auth/session";
import { WhatsAppAuthProvider } from "@/lib/customer-auth/providers/whatsapp";

const AUTH_PROVIDER_ID = WhatsAppAuthProvider.id;

const PHONE_RATE_WINDOW_MS = 15 * 60 * 1000;
const PHONE_RATE_MAX = 3;
const IP_RATE_WINDOW_MS = 15 * 60 * 1000;
const IP_RATE_MAX = 10;

function clientIp(request: NextRequest): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

/**
 * Create + deliver WhatsApp OTP (hashed only in DB).
 * Used by /api/auth/whatsapp/send-code and legacy /api/auth/otp/request.
 */
export async function handleWhatsAppSendCode(
  request: NextRequest
): Promise<NextResponse> {
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
        { error: "تسجيل الدخول عبر واتساب غير مفعّل حالياً" },
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
    const ip = clientIp(request);
    const ua = request.headers.get("user-agent");
    const sincePhone = new Date(Date.now() - PHONE_RATE_WINDOW_MS).toISOString();
    const sinceIp = new Date(Date.now() - IP_RATE_WINDOW_MS).toISOString();

    const { data: recentPhone, error: recentErr } = await supabase
      .from("otp_requests")
      .select("id, created_at")
      .eq("destination", e164)
      .gte("created_at", sincePhone)
      .order("created_at", { ascending: false });

    if (recentErr && !isMissingTableError(recentErr, "otp_requests")) {
      return NextResponse.json(
        { error: "تعذّر التحقق من الحد. طبّقي ترحيل 028 أولاً." },
        { status: 503 }
      );
    }

    if ((recentPhone?.length ?? 0) >= PHONE_RATE_MAX) {
      return NextResponse.json(
        { error: "تم تجاوز حد الإرسال لهذا الرقم. حاولي بعد قليلاً." },
        { status: 429 }
      );
    }

    if (ip) {
      const { data: recentIp } = await supabase
        .from("otp_requests")
        .select("id")
        .eq("ip_address", ip)
        .gte("created_at", sinceIp);

      if ((recentIp?.length ?? 0) >= IP_RATE_MAX) {
        return NextResponse.json(
          { error: "تم تجاوز حد الإرسال من هذا الجهاز. حاولي بعد قليلاً." },
          { status: 429 }
        );
      }
    }

    const last = recentPhone?.[0];
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
        channel: "whatsapp",
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

    const delivered = await sendWhatsAppOtp({ toE164: e164, code });

    // Dev fallback when no WhatsApp provider is configured
    let channel: "whatsapp" | "dev" = "whatsapp";
    let provider: string | null = null;
    if (!delivered.ok) {
      if (
        process.env.NODE_ENV === "development" ||
        process.env.OTP_DEV_EXPOSE === "true"
      ) {
        console.info(`[OTP DEV WhatsApp] ${e164} → ${code}`);
        channel = "dev";
      } else {
        return NextResponse.json({ error: delivered.error }, { status: 503 });
      }
    } else {
      provider = delivered.provider;
    }

    const flags = getAuthEnvFlags();
    const payload: Record<string, unknown> = {
      ok: true,
      request_id: row.id,
      expires_in: settings.otp_expiration_seconds,
      resend_in: settings.otp_resend_seconds,
      channel,
      provider,
      destination_hint: `${e164.slice(0, 4)}•••${e164.slice(-3)}`,
      whatsapp_configured: flags.whatsappConfigured,
      // backward-compat for older UI
      sms_configured: flags.whatsappConfigured || flags.smsConfigured,
    };

    if (channel === "dev") {
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

/**
 * Verify WhatsApp OTP → establish Supabase session + customer profile.
 */
export async function handleWhatsAppVerifyCode(
  request: NextRequest
): Promise<NextResponse> {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "خدمة المصادقة غير مُعدّة" },
        { status: 503 }
      );
    }

    const settings = await getCustomerAuthSettings();
    const body = (await request.json().catch(() => ({}))) as {
      request_id?: string;
      dial?: string;
      phone?: string;
      code?: string;
      remember?: boolean;
      full_name?: string;
    };

    const code = (body.code || "").replace(/\D/g, "");
    if (code.length !== 6) {
      return NextResponse.json(
        { error: "أدخلي رمزًا مكوّنًا من 6 أرقام" },
        { status: 400 }
      );
    }

    const dial = (body.dial || "+972").trim();
    const e164 = toE164(dial, body.phone || "");
    if (!e164) {
      return NextResponse.json(
        { error: "رقم الهاتف غير صالح" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const ip = clientIp(request);
    const ua = request.headers.get("user-agent");

    let query = supabase
      .from("otp_requests")
      .select("*")
      .eq("destination", e164)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1);

    if (body.request_id) {
      query = supabase
        .from("otp_requests")
        .select("*")
        .eq("id", body.request_id)
        .limit(1);
    }

    const { data: rows, error } = await query;
    if (error && isMissingTableError(error, "otp_requests")) {
      return NextResponse.json(
        { error: "جداول OTP غير موجودة. طبّقي ترحيل 028." },
        { status: 503 }
      );
    }

    const otp = rows?.[0];
    if (!otp) {
      return NextResponse.json(
        { error: "لا يوجد رمز نشط. اطلبي رمزًا جديدًا." },
        { status: 400 }
      );
    }

    if (otp.consumed_at) {
      return NextResponse.json(
        { error: "تم استخدام هذا الرمز مسبقًا" },
        { status: 400 }
      );
    }

    if (new Date(otp.expires_at as string).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "انتهت صلاحية الرمز. اطلبي رمزًا جديدًا." },
        { status: 400 }
      );
    }

    const attempts = Number(otp.attempts) || 0;
    const maxAttempts =
      Number(otp.max_attempts) || settings.otp_max_attempts;
    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: "تم تجاوز عدد المحاولات. اطلبي رمزًا جديدًا." },
        { status: 429 }
      );
    }

    const ok = safeEqualHash(hashOtpCode(code), String(otp.code_hash));

    if (!ok) {
      await supabase
        .from("otp_requests")
        .update({ attempts: attempts + 1 })
        .eq("id", otp.id);

      await recordLoginHistory({
        method: AUTH_PROVIDER_ID,
        success: false,
        ip,
        userAgent: ua,
        meta: { destination: e164, reason: "bad_code" },
      });

      return NextResponse.json(
        {
          error: "رمز غير صحيح",
          attempts_left: Math.max(0, maxAttempts - attempts - 1),
        },
        { status: 401 }
      );
    }

    // Invalidate OTP immediately after success
    await supabase
      .from("otp_requests")
      .update({
        consumed_at: new Date().toISOString(),
        attempts: attempts + 1,
      })
      .eq("id", otp.id);

    const session = await establishPhoneSession({
      e164,
      fullName: body.full_name,
      provider: AUTH_PROVIDER_ID,
    });

    if (!session.ok) {
      return NextResponse.json({ error: session.error }, { status: 500 });
    }

    const customer = await getCustomerByAuthUserId(session.userId);
    if (customer) {
      await recordLoginHistory({
        customerId: customer.id,
        authUserId: session.userId,
        method: AUTH_PROVIDER_ID,
        success: true,
        ip,
        userAgent: ua,
        meta: {
          channel: otp.channel || AUTH_PROVIDER_ID,
          merged: session.merged ?? false,
        },
      });
      await recordCustomerSession({
        customerId: customer.id,
        authUserId: session.userId,
        remember: body.remember,
        ip,
        userAgent: ua,
      });
    }

    return NextResponse.json({
      ok: true,
      redirect: "/account",
      customer: customer
        ? {
            id: customer.id,
            full_name: customer.full_name,
            phone: customer.phone,
            email: customer.email,
            provider: customer.provider ?? AUTH_PROVIDER_ID,
          }
        : null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
