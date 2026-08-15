/**
 * Israel Post adapter (placeholder).
 *
 * Registered so Admin can see and configure it. Live Doar Israel / Israel Post
 * shipping API is not implemented — testConnection never reports Connected,
 * and createShipment never invents tracking numbers.
 */

import type {
  CarrierRuntimeConfig,
  ShippingCarrier,
  ShippingCarrierAdapter,
} from "./types";

const CODE = "israel_post";

const NOT_IMPLEMENTED =
  "Israel Post live API is not implemented yet. Credentials can be stored in Admin; connection is not verified and no tracking numbers are created.";

function missingRequired(config: CarrierRuntimeConfig, keys: string[]): string[] {
  return keys.filter((k) => !config.secrets[k]?.trim());
}

function bindIsraelPost(config: CarrierRuntimeConfig): ShippingCarrier {
  const required = israelPostAdapter.requiredSecretKeys;

  return {
    code: CODE,
    isConnected() {
      return false;
    },
    async testConnection() {
      const missing = missingRequired(config, required);
      if (missing.length) {
        return {
          ok: false,
          reason: "not_configured",
          error: `Missing credentials: ${missing.join(", ")}`,
        };
      }
      return {
        ok: false,
        reason: "not_implemented",
        error: NOT_IMPLEMENTED,
      };
    },
    async createShipment() {
      const missing = missingRequired(config, required);
      if (missing.length) {
        return { ok: false, reason: "not_configured", error: "Not configured" };
      }
      return { ok: false, reason: "not_implemented", error: NOT_IMPLEMENTED };
    },
    async getTrackingStatus() {
      return { ok: false, reason: "not_implemented", error: NOT_IMPLEMENTED };
    },
    async cancelShipment() {
      return { ok: false, reason: "not_implemented", error: NOT_IMPLEMENTED };
    },
    async getShippingLabel() {
      return { ok: false, reason: "not_implemented", error: NOT_IMPLEMENTED };
    },
    async listServices() {
      return [];
    },
  };
}

export const israelPostAdapter: ShippingCarrierAdapter = {
  code: CODE,
  label: {
    ar: "بريد إسرائيل",
    he: "דואר ישראל",
    en: "Israel Post",
  },
  implementationReady: false,
  supportsListServices: true,
  supportsCancel: true,
  requiredSecretKeys: ["api_key"],
  credentialFields: [
    {
      key: "account_id",
      label: "Account ID",
      label_he: "מספר חשבון",
      label_ar: "معرّف الحساب",
      kind: "public",
      inputType: "text",
    },
    {
      key: "api_key",
      label: "API Key",
      label_he: "מפתח API",
      label_ar: "مفتاح API",
      kind: "secret",
      required: true,
      inputType: "password",
    },
    {
      key: "api_secret",
      label: "API Secret",
      label_he: "סוד API",
      label_ar: "سر API",
      kind: "secret",
      inputType: "password",
    },
    {
      key: "username",
      label: "Username",
      label_he: "שם משתמש",
      label_ar: "اسم المستخدم",
      kind: "secret",
      inputType: "text",
    },
    {
      key: "password",
      label: "Password",
      label_he: "סיסמה",
      label_ar: "كلمة المرور",
      kind: "secret",
      inputType: "password",
    },
  ],
  bind: bindIsraelPost,
};
