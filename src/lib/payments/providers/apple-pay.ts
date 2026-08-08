import { placeholderPaymentProvider } from "./placeholder";

export const applePayPaymentProvider = placeholderPaymentProvider({
  id: "apple_pay",
  label: {
    ar: "Apple Pay",
    he: "Apple Pay",
    en: "Apple Pay",
  },
  defaultSortOrder: 3,
  credentialFields: [
    {
      key: "merchant_id",
      label: "Apple Merchant ID",
      kind: "public",
      required: true,
    },
    {
      key: "merchant_cert",
      label: "Merchant Identity Certificate",
      kind: "secret",
      required: true,
    },
    {
      key: "payment_processing_cert",
      label: "Payment Processing Certificate",
      kind: "secret",
      required: false,
    },
    {
      key: "webhook_secret",
      label: "Webhook Secret",
      kind: "secret",
      required: false,
    },
  ],
  requiredSecretKeys: ["merchant_cert"],
  supportsWebhook: true,
  supportsRefund: true,
});
