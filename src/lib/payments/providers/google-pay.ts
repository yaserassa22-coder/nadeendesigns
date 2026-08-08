import { placeholderPaymentProvider } from "./placeholder";

export const googlePayPaymentProvider = placeholderPaymentProvider({
  id: "google_pay",
  label: {
    ar: "Google Pay",
    he: "Google Pay",
    en: "Google Pay",
  },
  defaultSortOrder: 4,
  credentialFields: [
    {
      key: "merchant_id",
      label: "Google Pay Merchant ID",
      kind: "public",
      required: true,
    },
    {
      key: "api_key",
      label: "API Key",
      kind: "secret",
      required: true,
    },
    {
      key: "secret_key",
      label: "Secret Key",
      kind: "secret",
      required: true,
    },
    {
      key: "webhook_secret",
      label: "Webhook Secret",
      kind: "secret",
      required: false,
    },
  ],
  requiredSecretKeys: ["api_key", "secret_key"],
  supportsWebhook: true,
  supportsRefund: true,
});
