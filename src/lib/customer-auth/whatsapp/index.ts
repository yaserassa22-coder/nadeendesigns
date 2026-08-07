import type { WhatsAppProvider, WhatsAppProviderId, WhatsAppSendResult } from "./types";
import { createMetaWhatsAppProvider } from "./meta";
import { createTwilioWhatsAppProvider } from "./twilio";
import { create360DialogWhatsAppProvider } from "./dialog360";
import { getCustomerAuthSettings } from "@/lib/customer-auth/settings";
import { getAuthChannel } from "@/types/customer-auth";

export type { WhatsAppProvider, WhatsAppProviderId, WhatsAppSendResult };
export { createMetaWhatsAppProvider } from "./meta";
export { createTwilioWhatsAppProvider } from "./twilio";
export { create360DialogWhatsAppProvider } from "./dialog360";

function resolvePreferredProviderId(
  adminPreference?: string
): WhatsAppProviderId | "auto" {
  const fromAdmin = (adminPreference || "").trim().toLowerCase();
  if (
    fromAdmin === "meta" ||
    fromAdmin === "twilio" ||
    fromAdmin === "360dialog"
  ) {
    return fromAdmin;
  }
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
 * - Admin channel configuration.provider (customer_auth) preferred
 * - else WHATSAPP_PROVIDER=meta|twilio|360dialog
 * - else auto → Meta if configured, else Twilio, else 360dialog
 */
export function getWhatsAppProvider(
  preferred?: string
): WhatsAppProvider | null {
  const providers = listWhatsAppProviders();
  const prefer = resolvePreferredProviderId(preferred);

  if (prefer !== "auto") {
    const match = providers.find((p) => p.id === prefer);
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
 * Admin can pick provider preference from Customer Auth channels (no code edit).
 */
export async function sendWhatsAppOtp(params: {
  toE164: string;
  code: string;
}): Promise<
  | { ok: true; provider: WhatsAppProviderId; messageId?: string; channel: "whatsapp" }
  | { ok: false; error: string }
> {
  let preferred: string | undefined;
  try {
    const settings = await getCustomerAuthSettings();
    const channel = getAuthChannel(settings, "whatsapp");
    const raw = channel?.configuration?.provider;
    if (typeof raw === "string") preferred = raw;
  } catch {
    /* settings optional for send path */
  }

  const provider = getWhatsAppProvider(preferred);
  if (!provider) {
    return {
      ok: false,
      error:
        "واتساب غير مُعد. من الإدارة → المصادقة: اختاري المزوّد وأزيلي «قريباً»، ثم أضيفي مفاتيح Meta أو Twilio أو 360dialog في البيئة.",
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
