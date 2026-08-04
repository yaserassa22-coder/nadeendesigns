import { normalizeWhatsAppTo } from "@/lib/notifications/whatsapp";
import type { WhatsAppProvider, WhatsAppSendResult } from "./types";

/**
 * Twilio WhatsApp Business (existing path adapted for OTP).
 *
 * Env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
 * Optional Content API template: TWILIO_WHATSAPP_CONTENT_SID
 *   (if set, sends ContentSid + ContentVariables with {"1": code})
 */
export function createTwilioWhatsAppProvider(): WhatsAppProvider {
  return {
    id: "twilio",
    isConfigured() {
      return Boolean(
        process.env.TWILIO_ACCOUNT_SID?.trim() &&
          process.env.TWILIO_AUTH_TOKEN?.trim() &&
          process.env.TWILIO_WHATSAPP_FROM?.trim()
      );
    },
    async sendOtp({ toE164, code }): Promise<WhatsAppSendResult> {
      if (!this.isConfigured()) {
        return {
          ok: false,
          provider: "twilio",
          error:
            "Twilio WhatsApp غير مُعد (TWILIO_ACCOUNT_SID / AUTH_TOKEN / WHATSAPP_FROM)",
        };
      }

      const toDigits = normalizeWhatsAppTo(toE164);
      if (!toDigits) {
        return { ok: false, provider: "twilio", error: "رقم واتساب غير صالح" };
      }

      const sid = process.env.TWILIO_ACCOUNT_SID!.trim();
      const token = process.env.TWILIO_AUTH_TOKEN!.trim();
      const fromRaw = process.env.TWILIO_WHATSAPP_FROM!.trim();
      const from = fromRaw.startsWith("whatsapp:")
        ? fromRaw
        : `whatsapp:${fromRaw}`;
      const to = `whatsapp:+${toDigits}`;
      const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID?.trim();

      try {
        const auth = Buffer.from(`${sid}:${token}`).toString("base64");
        const body = new URLSearchParams({ From: from, To: to });

        if (contentSid) {
          body.set("ContentSid", contentSid);
          body.set("ContentVariables", JSON.stringify({ "1": code }));
        } else {
          body.set(
            "Body",
            `رمز التحقق من NadEEN Designs: ${code}\nصالح لمدة محدودة. لا تشاركي الرمز مع أحد.`
          );
        }

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
            provider: "twilio",
            error:
              json.message ||
              json.error_message ||
              `فشل إرسال واتساب عبر Twilio (${res.status})`,
          };
        }

        return { ok: true, provider: "twilio", messageId: json.sid };
      } catch (e) {
        return {
          ok: false,
          provider: "twilio",
          error:
            e instanceof Error
              ? e.message
              : "خطأ غير متوقع أثناء إرسال Twilio WhatsApp",
        };
      }
    },
  };
}
