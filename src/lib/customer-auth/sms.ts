import { normalizeWhatsAppTo } from "@/lib/notifications/whatsapp";
import { sendEmail } from "@/lib/notifications/email";
import { isResendConfigured } from "@/lib/notifications/config";
import { sendWhatsAppOtp } from "@/lib/customer-auth/whatsapp";

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_SMS_FROM?.trim()
  );
}

/** Send OTP via Twilio SMS when TWILIO_SMS_FROM is set (legacy fallback). */
export async function sendOtpSms(params: {
  to: string;
  code: string;
}): Promise<{ ok: true; channel: "sms" } | { ok: false; error: string }> {
  if (!isSmsConfigured()) {
    return { ok: false, error: "SMS غير مُعد (TWILIO_SMS_FROM)" };
  }

  const toDigits = normalizeWhatsAppTo(params.to);
  if (!toDigits) return { ok: false, error: "رقم هاتف غير صالح" };

  const sid = process.env.TWILIO_ACCOUNT_SID!.trim();
  const token = process.env.TWILIO_AUTH_TOKEN!.trim();
  const from = process.env.TWILIO_SMS_FROM!.trim();

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const body = new URLSearchParams({
      From: from,
      To: `+${toDigits}`,
      Body: `رمز التحقق من NadEEN Designs: ${params.code}\nصالح لمدة محدودة. لا تشاركي الرمز مع أحد.`,
    });

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      }
    );

    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as {
        message?: string;
      };
      return {
        ok: false,
        error: json.message || `فشل إرسال SMS (${res.status})`,
      };
    }
    return { ok: true, channel: "sms" };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "فشل إرسال SMS",
    };
  }
}

/**
 * Deliver OTP: WhatsApp Business first (Meta/Twilio/360dialog) → SMS → dev.
 * Prefer /api/auth/whatsapp/send-code which uses WhatsApp-only path.
 */
export async function deliverPhoneOtp(params: {
  to: string;
  code: string;
}): Promise<
  | { ok: true; channel: "sms" | "whatsapp" | "dev" }
  | { ok: false; error: string }
> {
  const wa = await sendWhatsAppOtp({ toE164: params.to, code: params.code });
  if (wa.ok) return { ok: true, channel: "whatsapp" };

  const sms = await sendOtpSms(params);
  if (sms.ok) return sms;

  if (
    process.env.NODE_ENV === "development" ||
    process.env.OTP_DEV_EXPOSE === "true"
  ) {
    console.info(`[OTP DEV] ${params.to} → ${params.code}`);
    return { ok: true, channel: "dev" };
  }

  return {
    ok: false,
    error:
      wa.error ||
      sms.error ||
      "تعذّر إرسال رمز التحقق. تأكدي من إعداد واتساب (Meta/Twilio).",
  };
}

export async function deliverEmailOtp(params: {
  to: string;
  code: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isResendConfigured()) {
    if (
      process.env.NODE_ENV === "development" ||
      process.env.OTP_DEV_EXPOSE === "true"
    ) {
      console.info(`[OTP DEV EMAIL] ${params.to} → ${params.code}`);
      return { ok: true };
    }
    return { ok: false, error: "البريد غير مُعد (Resend)" };
  }

  const result = await sendEmail({
    to: params.to,
    subject: "رمز التحقق — NadEEN Designs",
    html: `
      <div style="font-family:Georgia,serif;direction:rtl;text-align:right;color:#2c2419">
        <h2 style="color:#C9A14A">NadEEN Designs</h2>
        <p>رمز التحقق الخاص بك:</p>
        <p style="font-size:28px;letter-spacing:8px;font-weight:bold">${params.code}</p>
        <p style="color:#6b5e4f;font-size:13px">صالح لمدة محدودة. لا تشاركي الرمز مع أحد.</p>
      </div>
    `,
  });

  if (!result.ok) {
    return { ok: false, error: result.error || "فشل إرسال البريد" };
  }
  return { ok: true };
}
