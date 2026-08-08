import type { InvoiceProvider, IssueInvoiceResult } from "../types";

function externalPlaceholder(def: {
  id: string;
  label: InvoiceProvider["label"];
  credentialFields: InvoiceProvider["credentialFields"];
  requiredSecretKeys: string[];
  docsHint: string;
}): InvoiceProvider {
  const msg = `${def.label.en}: credentials can be saved in Admin. ${def.docsHint}`;

  return {
    id: def.id,
    label: def.label,
    implementationReady: false,
    credentialFields: def.credentialFields,
    requiredSecretKeys: def.requiredSecretKeys,
    supportsTestConnection: true,
    supportsTestDocument: true,
    async issueDocument(): Promise<IssueInvoiceResult> {
      return { ok: false, error: msg, retryable: false };
    },
    async testConnection(input) {
      const missing = def.requiredSecretKeys.filter(
        (k) => !input.secrets[k]?.trim()
      );
      if (missing.length) {
        return { ok: false, message: `Missing: ${missing.join(", ")}` };
      }
      return {
        ok: true,
        message:
          "Credentials stored. Live API adapter activates when the provider endpoint is configured.",
      };
    },
    async testDocument(): Promise<IssueInvoiceResult> {
      return { ok: false, error: msg };
    },
  };
}

export const greenInvoiceProvider = externalPlaceholder({
  id: "green_invoice",
  label: {
    ar: "חשבונית ירוקה (Green Invoice)",
    he: "חשבונית ירוקה",
    en: "Green Invoice",
  },
  docsHint: "Connect Green Invoice API keys from the Admin panel.",
  credentialFields: [
    { key: "api_key", label: "API Key", kind: "secret", required: true },
    { key: "api_secret", label: "API Secret", kind: "secret", required: true },
    {
      key: "account_id",
      label: "Account ID",
      kind: "public",
      required: false,
    },
  ],
  requiredSecretKeys: ["api_key", "api_secret"],
});

export const morningInvoiceProvider = externalPlaceholder({
  id: "morning",
  label: {
    ar: "Morning by Green Invoice",
    he: "Morning (חשבונית ירוקה)",
    en: "Morning by Green Invoice",
  },
  docsHint: "Morning uses Green Invoice credentials — enter them in Admin.",
  credentialFields: [
    { key: "api_key", label: "API Key", kind: "secret", required: true },
    { key: "api_secret", label: "API Secret", kind: "secret", required: true },
  ],
  requiredSecretKeys: ["api_key", "api_secret"],
});

export const icountInvoiceProvider = externalPlaceholder({
  id: "icount",
  label: {
    ar: "iCount",
    he: "iCount",
    en: "iCount",
  },
  docsHint: "Enter iCount company ID + user + token in Admin.",
  credentialFields: [
    { key: "company_id", label: "Company ID", kind: "public", required: true },
    { key: "user", label: "User", kind: "public", required: true },
    { key: "token", label: "Token", kind: "secret", required: true },
  ],
  requiredSecretKeys: ["token"],
});

export const easycountInvoiceProvider = externalPlaceholder({
  id: "easycount",
  label: {
    ar: "EasyCount",
    he: "EasyCount",
    en: "EasyCount",
  },
  docsHint: "Enter EasyCount API credentials in Admin.",
  credentialFields: [
    { key: "api_key", label: "API Key", kind: "secret", required: true },
    {
      key: "company_id",
      label: "Company ID",
      kind: "public",
      required: true,
    },
  ],
  requiredSecretKeys: ["api_key"],
});
