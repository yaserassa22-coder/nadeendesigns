/**
 * Invoice provider plugin contract.
 * Add a provider by implementing InvoiceProvider + registerInvoiceProvider().
 */

import type { CredentialFieldDef, LocalizedProviderLabel } from "@/lib/commerce/types";
import type { ShopOrder } from "@/types/shop";
import type { StoreSettings } from "@/types/store";
import type { CommerceInvoicingSettings } from "@/lib/commerce/types";

export type IssueInvoiceInput = {
  order: ShopOrder;
  store: StoreSettings;
  invoicing: CommerceInvoicingSettings;
  secrets: Record<string, string>;
  publicConfig: Record<string, string>;
  /** Optional pre-built PDF bytes from internal renderer */
  pdfBytes?: Uint8Array;
};

export type IssueInvoiceResult =
  | {
      ok: true;
      documentNumber: string;
      externalId?: string;
      pdfBytes?: Uint8Array;
      pdfUrl?: string;
      metadata?: Record<string, unknown>;
    }
  | { ok: false; error: string; retryable?: boolean };

export type TestInvoiceConnectionResult = {
  ok: boolean;
  message: string;
};

export type InvoiceProvider = {
  id: string;
  label: LocalizedProviderLabel;
  implementationReady: boolean;
  credentialFields: CredentialFieldDef[];
  requiredSecretKeys: string[];
  supportsTestConnection: boolean;
  supportsTestDocument: boolean;

  issueDocument: (input: IssueInvoiceInput) => Promise<IssueInvoiceResult>;

  testConnection?: (input: {
    secrets: Record<string, string>;
    publicConfig: Record<string, string>;
  }) => Promise<TestInvoiceConnectionResult>;

  /** Optional dry-run / sample document */
  testDocument?: (input: {
    secrets: Record<string, string>;
    publicConfig: Record<string, string>;
    invoicing: CommerceInvoicingSettings;
    store: StoreSettings;
  }) => Promise<IssueInvoiceResult>;
};
