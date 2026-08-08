import type { PaymentProvider } from "../types";

/** Cash on Delivery / boutique — always available, no external API. */
export const codPaymentProvider: PaymentProvider = {
  id: "cod",
  label: {
    ar: "الدفع عند الاستلام",
    he: "תשלום בעת קבלה",
    en: "Cash on Delivery",
  },
  defaultSortOrder: 0,
  implementationReady: true,
  credentialFields: [],
  requiredSecretKeys: [],
  supportsWebhook: false,
  supportsRefund: false,
  supportsTestConnection: true,
  async createPayment(input) {
    return {
      ok: true,
      status: "pending",
      externalId: `cod-${input.order.id}`,
      metadata: { method: "cod" },
    };
  },
  async testConnection() {
    return { ok: true, message: "COD does not require external credentials." };
  },
};
