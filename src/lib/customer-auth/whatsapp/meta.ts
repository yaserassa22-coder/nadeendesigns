import { normalizeWhatsAppTo } from "@/lib/notifications/whatsapp";
import type { WhatsAppProvider, WhatsAppSendResult } from "./types";

/**
 * Meta WhatsApp Cloud API (preferred).
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Env:
 * - WHATSAPP_META_TOKEN (permanent system user token)
 * - WHATSAPP_META_PHONE_NUMBER_ID
 * - WHATSAPP_META_OTP_TEMPLATE (optional approved auth template name)
 * - WHATSAPP_META_OTP_TEMPLATE_LANG (default ar)
 * - WHATSAPP_META_API_VERSION (default v21.0)
 */
export function createMetaWhatsAppProvider(): WhatsAppProvider {
  return {
    id: "meta",
    isConfigured() {
      return Boolean(
        process.env.WHATSAPP_META_TOKEN?.trim() &&
          process.env.WHATSAPP_META_PHONE_NUMBER_ID?.trim()
      );
    },
    async sendOtp({ toE164, code }): Promise<WhatsAppSendResult> {
      if (!this.isConfigured()) {
        return {
          ok: false,
          provider: "meta",
          error:
            "Meta WhatsApp غير مُعد (WHATSAPP_META_TOKEN + WHATSAPP_META_PHONE_NUMBER_ID)",
        };
      }

      const toDigits = normalizeWhatsAppTo(toE164);
      if (!toDigits) {
        return { ok: false, provider: "meta", error: "رقم واتساب غير صالح" };
      }

      const token = process.env.WHATSAPP_META_TOKEN!.trim();
      const phoneNumberId = process.env.WHATSAPP_META_PHONE_NUMBER_ID!.trim();
      const version =
        process.env.WHATSAPP_META_API_VERSION?.trim() || "v21.0";
      const template = process.env.WHATSAPP_META_OTP_TEMPLATE?.trim();
      const lang =
        process.env.WHATSAPP_META_OTP_TEMPLATE_LANG?.trim() || "ar";
      // Auth templates often include a URL button with the OTP copy param
      const includeButton =
        process.env.WHATSAPP_META_OTP_TEMPLATE_BUTTON !== "false";

      const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

      const templateComponents: Record<string, unknown>[] = [
        {
          type: "body",
          parameters: [{ type: "text", text: code }],
        },
      ];
      if (includeButton) {
        templateComponents.push({
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: code }],
        });
      }

      const payload = template
        ? {
            messaging_product: "whatsapp",
            to: toDigits,
            type: "template",
            template: {
              name: template,
              language: { code: lang },
              components: templateComponents,
            },
          }
        : {
            messaging_product: "whatsapp",
            to: toDigits,
            type: "text",
            text: {
              preview_url: false,
              body: `رمز التحقق من NadEEN Designs: ${code}\nصالح لمدة محدودة. لا تشاركي الرمز مع أحد.`,
            },
          };

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const json = (await res.json().catch(() => ({}))) as {
          messages?: { id?: string }[];
          error?: { message?: string };
        };

        if (!res.ok) {
          return {
            ok: false,
            provider: "meta",
            error:
              json.error?.message ||
              `فشل إرسال واتساب عبر Meta (${res.status})`,
          };
        }

        return {
          ok: true,
          provider: "meta",
          messageId: json.messages?.[0]?.id,
        };
      } catch (e) {
        return {
          ok: false,
          provider: "meta",
          error:
            e instanceof Error ? e.message : "خطأ غير متوقع أثناء إرسال Meta",
        };
      }
    },
  };
}
