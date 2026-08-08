import { placeholderPaymentProvider } from "./placeholder";

/** Generic credit-card gateway slot (Tranzila / Cardcom / PayPlus, etc.). */
export const creditCardPaymentProvider = placeholderPaymentProvider({
  id: "credit_card",
  label: {
    ar: "بطاقة ائتمان",
    he: "כרטיס אשראי",
    en: "Credit Card Gateway",
  },
  defaultSortOrder: 1,
  credentialFields: [
    {
      key: "api_key",
      label: "API Key",
      label_he: "מפתח API",
      kind: "secret",
      required: true,
    },
    {
      key: "secret_key",
      label: "Secret Key",
      label_he: "מפתח סודי",
      kind: "secret",
      required: true,
    },
    {
      key: "merchant_id",
      label: "Merchant ID",
      label_he: "מזהה סוחר",
      kind: "public",
      required: true,
    },
    {
      key: "webhook_secret",
      label: "Webhook Secret",
      label_he: "סוד Webhook",
      kind: "secret",
      required: false,
    },
  ],
  requiredSecretKeys: ["api_key", "secret_key"],
  supportsWebhook: true,
  supportsRefund: true,
});
