import { placeholderPaymentProvider } from "./placeholder";

export const paypalPaymentProvider = placeholderPaymentProvider({
  id: "paypal",
  label: {
    ar: "PayPal",
    he: "PayPal",
    en: "PayPal",
  },
  defaultSortOrder: 5,
  credentialFields: [
    {
      key: "client_id",
      label: "Client ID",
      kind: "public",
      required: true,
    },
    {
      key: "client_secret",
      label: "Client Secret",
      kind: "secret",
      required: true,
    },
    {
      key: "webhook_id",
      label: "Webhook ID",
      kind: "public",
      required: false,
    },
    {
      key: "webhook_secret",
      label: "Webhook Secret",
      kind: "secret",
      required: false,
    },
  ],
  requiredSecretKeys: ["client_secret"],
  supportsWebhook: true,
  supportsRefund: true,
});
