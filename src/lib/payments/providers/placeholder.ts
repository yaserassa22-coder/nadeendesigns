/**
 * Placeholder gateway helper — admin stores credentials; charge API activates
 * when the provider publishes live endpoints (no code change to orchestration).
 */

import type {
  CreatePaymentResult,
  PaymentProvider,
  TestConnectionResult,
  WebhookVerifyResult,
} from "../types";

export function placeholderPaymentProvider(
  def: Omit<
    PaymentProvider,
    | "implementationReady"
    | "createPayment"
    | "verifyWebhook"
    | "testConnection"
    | "supportsTestConnection"
  > & { notReadyMessage?: string }
): PaymentProvider {
  const msg =
    def.notReadyMessage ||
    `${def.label.en}: credentials can be saved in Admin. Live charge API activates when the gateway is connected.`;

  return {
    ...def,
    implementationReady: false,
    supportsTestConnection: true,
    async createPayment(): Promise<CreatePaymentResult> {
      return { ok: false, error: msg, code: "provider_not_ready" };
    },
    async verifyWebhook(input): Promise<WebhookVerifyResult> {
      return {
        ok: false,
        signatureValid: Boolean(input.secrets.webhook_secret),
        error: msg,
        eventId: input.headers["x-event-id"] || `evt-${Date.now()}`,
        eventType: "placeholder",
      };
    },
    async testConnection(input): Promise<TestConnectionResult> {
      const missing = def.requiredSecretKeys.filter(
        (k) => !input.secrets[k]?.trim()
      );
      if (missing.length) {
        return {
          ok: false,
          message: `Missing credentials: ${missing.join(", ")}`,
        };
      }
      return {
        ok: true,
        message:
          "Credentials stored successfully. Live API verification will run when the gateway adapter is activated.",
      };
    },
  };
}
