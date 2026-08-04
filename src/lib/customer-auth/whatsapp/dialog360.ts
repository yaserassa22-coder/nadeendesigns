import { normalizeWhatsAppTo } from "@/lib/notifications/whatsapp";
import type { WhatsAppProvider, WhatsAppSendResult } from "./types";

/**
 * 360dialog WhatsApp Business API.
 *
 * Env:
 * - WHATSAPP_360DIALOG_API_KEY
 * - WHATSAPP_360DIALOG_BASE_URL (default https://waba.360dialog.io)
 * - WHATSAPP_360DIALOG_OTP_TEMPLATE (optional template name)
 * - WHATSAPP_360DIALOG_OTP_TEMPLATE_LANG (default ar)
 */
export function create360DialogWhatsAppProvider(): WhatsAppProvider {
  return {
    id: "360dialog",
    isConfigured() {
      return Boolean(process.env.WHATSAPP_360DIALOG_API_KEY?.trim());
    },
    async sendOtp({ toE164, code }): Promise<WhatsAppSendResult> {
      if (!this.isConfigured()) {
        return {
          ok: false,
          provider: "360dialog",
          error: "360dialog غير مُعد (WHATSAPP_360DIALOG_API_KEY)",
        };
      }

      const toDigits = normalizeWhatsAppTo(toE164);
      if (!toDigits) {
        return {
          ok: false,
          provider: "360dialog",
          error: "رقم واتساب غير صالح",
        };
      }

      const apiKey = process.env.WHATSAPP_360DIALOG_API_KEY!.trim();
      const base = (
        process.env.WHATSAPP_360DIALOG_BASE_URL?.trim() ||
        "https://waba.360dialog.io"
      ).replace(/\/$/, "");
      const template = process.env.WHATSAPP_360DIALOG_OTP_TEMPLATE?.trim();
      const lang =
        process.env.WHATSAPP_360DIALOG_OTP_TEMPLATE_LANG?.trim() || "ar";

      const payload = template
        ? {
            to: toDigits,
            type: "template",
            template: {
              namespace: template,
              language: { code: lang },
              components: [
                {
                  type: "body",
                  parameters: [{ type: "text", text: code }],
                },
              ],
            },
          }
        : {
            to: toDigits,
            type: "text",
            text: {
              body: `رمز التحقق من NadEEN Designs: ${code}\nصالح لمدة محدودة. لا تشاركي الرمز مع أحد.`,
            },
          };

      try {
        const res = await fetch(`${base}/v1/messages`, {
          method: "POST",
          headers: {
            "D360-API-KEY": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const json = (await res.json().catch(() => ({}))) as {
          messages?: { id?: string }[];
          meta?: { developer_message?: string };
          errors?: { title?: string; details?: string }[];
        };

        if (!res.ok) {
          const errMsg =
            json.errors?.[0]?.details ||
            json.errors?.[0]?.title ||
            json.meta?.developer_message ||
            `فشل إرسال واتساب عبر 360dialog (${res.status})`;
          return { ok: false, provider: "360dialog", error: errMsg };
        }

        return {
          ok: true,
          provider: "360dialog",
          messageId: json.messages?.[0]?.id,
        };
      } catch (e) {
        return {
          ok: false,
          provider: "360dialog",
          error:
            e instanceof Error
              ? e.message
              : "خطأ غير متوقع أثناء إرسال 360dialog",
        };
      }
    },
  };
}
