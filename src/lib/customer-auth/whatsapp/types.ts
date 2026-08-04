/** WhatsApp Business OTP delivery providers */

export type WhatsAppProviderId = "meta" | "twilio" | "360dialog";

export type WhatsAppSendResult =
  | { ok: true; provider: WhatsAppProviderId; messageId?: string }
  | { ok: false; error: string; provider: WhatsAppProviderId };

export interface WhatsAppProvider {
  readonly id: WhatsAppProviderId;
  isConfigured(): boolean;
  sendOtp(params: { toE164: string; code: string }): Promise<WhatsAppSendResult>;
}
