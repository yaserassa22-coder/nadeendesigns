import { isWhatsAppConfigured } from "@/lib/notifications/config";
import { phoneDigits } from "@/lib/phone";

/** Normalize phone to E.164-ish digits for Twilio WhatsApp. */
export function normalizeWhatsAppTo(phone: string): string | null {
  const digits = phoneDigits(phone);
  if (digits.length < 9) return null;

  // Israel local 05xxxxxxxx → 9725xxxxxxxx
  if (digits.startsWith("0") && digits.length === 10) {
    return `972${digits.slice(1)}`;
  }
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("970")) return digits;
  return digits;
}

export async function sendWhatsApp(params: {
  to: string;
  body: string;
}): Promise<{ ok: true; sid?: string } | { ok: false; error: string }> {
  if (!isWhatsAppConfigured()) {
    return {
      ok: false,
      error:
        "WhatsApp غير مُعد. أضيفي TWILIO_ACCOUNT_SID و TWILIO_AUTH_TOKEN و TWILIO_WHATSAPP_FROM",
    };
  }

  const toDigits = normalizeWhatsAppTo(params.to);
  if (!toDigits) {
    return { ok: false, error: "رقم واتساب غير صالح" };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID!.trim();
  const token = process.env.TWILIO_AUTH_TOKEN!.trim();
  const from = process.env.TWILIO_WHATSAPP_FROM!.trim();
  const to = params.to.startsWith("whatsapp:")
    ? params.to
    : `whatsapp:+${toDigits}`;

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const body = new URLSearchParams({
      From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
      To: to,
      Body: params.body,
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

    const json = (await res.json().catch(() => ({}))) as {
      sid?: string;
      message?: string;
      error_message?: string;
    };

    if (!res.ok) {
      return {
        ok: false,
        error:
          json.message ||
          json.error_message ||
          `فشل إرسال واتساب (رمز ${res.status})`,
      };
    }

    return { ok: true, sid: json.sid };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "خطأ غير متوقع أثناء إرسال واتساب",
    };
  }
}
