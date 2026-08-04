import type { WhatsAppProvider, WhatsAppProviderId, WhatsAppSendResult } from "./types";
import { createMetaWhatsAppProvider } from "./meta";
import { createTwilioWhatsAppProvider } from "./twilio";
import { create360DialogWhatsAppProvider } from "./dialog360";

export type { WhatsAppProvider, WhatsAppProviderId, WhatsAppSendResult };
export { createMetaWhatsAppProvider } from "./meta";
export { createTwilioWhatsAppProvider } from "./twilio";
export { create360DialogWhatsAppProvider } from "./dialog360";

function resolvePreferredProviderId(): WhatsAppProviderId | "auto" {
  const raw = (process.env.WHATSAPP_PROVIDER || "auto").trim().toLowerCase();
  if (raw === "meta" || raw === "twilio" || raw === "360dialog") return raw;
  return "auto";
}

/** All provider implementations (order used for auto-detect). */
export function listWhatsAppProviders(): WhatsAppProvider[] {
  return [
    createMetaWhatsAppProvider(),
    createTwilioWhatsAppProvider(),
    create360DialogWhatsAppProvider(),
  ];
}

/**
 * Select provider:
 * - WHATSAPP_PROVIDER=meta|twilio|360dialog → that provider (must be configured)
 * - WHATSAPP_PROVIDER=auto|unset → Meta if configured, else Twilio, else 360dialog
 */
export function getWhatsAppProvider(): WhatsAppProvider | null {
  const providers = listWhatsAppProviders();
  const preferred = resolvePreferredProviderId();

  if (preferred !== "auto") {
    const match = providers.find((p) => p.id === preferred);
    if (match?.isConfigured()) return match;
    return null;
  }

  return providers.find((p) => p.isConfigured()) ?? null;
}

export function isWhatsAppOtpConfigured(): boolean {
  return getWhatsAppProvider() !== null;
}

export function getActiveWhatsAppProviderId(): WhatsAppProviderId | null {
  return getWhatsAppProvider()?.id ?? null;
}

/**
 * Send OTP via the configured WhatsApp Business provider.
 * Never call from the client — credentials stay server-side.
 */
export async function sendWhatsAppOtp(params: {
  toE164: string;
  code: string;
}): Promise<
  | { ok: true; provider: WhatsAppProviderId; messageId?: string; channel: "whatsapp" }
  | { ok: false; error: string }
> {
  const provider = getWhatsAppProvider();
  if (!provider) {
    return {
      ok: false,
      error:
        "واتساب غير مُعد. عيّني WHATSAPP_PROVIDER مع بيانات Meta أو Twilio أو 360dialog.",
    };
  }

  const result = await provider.sendOtp(params);
  if (!result.ok) return { ok: false, error: result.error };
  return {
    ok: true,
    provider: result.provider,
    messageId: result.messageId,
    channel: "whatsapp",
  };
}
