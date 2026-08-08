/**
 * Shared commerce types — payments & invoicing platform config.
 * Stored in settings.key = 'commerce' (non-secret). Secrets → encrypted_secrets.
 */

export type CommerceMode = "test" | "live";

export type ConnectionStatus = "unknown" | "ok" | "error" | "not_configured";

export type CredentialFieldDef = {
  key: string;
  label: string;
  label_he?: string;
  label_ar?: string;
  /** secret = encrypted vault; public = stored in settings JSON */
  kind: "secret" | "public";
  inputType?: "text" | "password" | "url" | "email";
  required?: boolean;
  placeholder?: string;
  help?: string;
};

export type LocalizedProviderLabel = {
  ar: string;
  he: string;
  en: string;
};

export type PaymentProviderSettingsRow = {
  id: string;
  enabled: boolean;
  sort_order: number;
  /** Non-secret config (merchant id display, public keys, etc.) */
  public_config: Record<string, string>;
  connection_status: ConnectionStatus;
  last_tested_at?: string | null;
  last_error?: string | null;
};

export type InvoiceProviderSettingsRow = {
  id: string;
  public_config: Record<string, string>;
  connection_status: ConnectionStatus;
  last_tested_at?: string | null;
  last_error?: string | null;
};

export type CommerceInvoicingSettings = {
  active_provider_id: string;
  auto_issue_on_payment: boolean;
  auto_email_on_issue: boolean;
  retry_max_attempts: number;
  retry_backoff_seconds: number;
  /** Company block for external providers (extends store.tax / general) */
  company_name: string;
  company_name_he: string;
  vat_number: string;
  logo_url: string;
  email_subject: string;
  email_body_html: string;
  providers: InvoiceProviderSettingsRow[];
};

export type CommerceSettings = {
  mode: CommerceMode;
  payments: {
    providers: PaymentProviderSettingsRow[];
  };
  invoicing: CommerceInvoicingSettings;
};

export const DEFAULT_COMMERCE_SETTINGS: CommerceSettings = {
  mode: "test",
  payments: { providers: [] },
  invoicing: {
    active_provider_id: "internal",
    auto_issue_on_payment: true,
    auto_email_on_issue: true,
    retry_max_attempts: 5,
    retry_backoff_seconds: 120,
    company_name: "",
    company_name_he: "",
    vat_number: "",
    logo_url: "",
    email_subject: "חשבונית להזמנה {{order_number}}",
    email_body_html:
      "<p>שלום {{customer_name}},</p><p>מצורפת החשבונית להזמנה {{order_number}}.</p><p>{{store_name}}</p>",
    providers: [],
  },
};
