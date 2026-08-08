/**
 * Payment provider plugin contract.
 * Add a new gateway by implementing PaymentProvider + registerPaymentProvider().
 * No changes to checkout / webhook orchestration required.
 */

import type { CredentialFieldDef, LocalizedProviderLabel } from "@/lib/commerce/types";
import type { ShopOrder } from "@/types/shop";

export type PaymentMode = "test" | "live";

export type CreatePaymentInput = {
  order: ShopOrder;
  amount: number;
  currency: string;
  mode: PaymentMode;
  secrets: Record<string, string>;
  publicConfig: Record<string, string>;
  returnUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
};

export type CreatePaymentResult =
  | {
      ok: true;
      status: "pending" | "requires_action" | "processing" | "succeeded";
      externalId?: string;
      redirectUrl?: string;
      clientSecret?: string;
      metadata?: Record<string, unknown>;
    }
  | { ok: false; error: string; code?: string };

export type WebhookVerifyInput = {
  rawBody: string;
  headers: Record<string, string>;
  secrets: Record<string, string>;
  publicConfig: Record<string, string>;
  mode: PaymentMode;
};

export type WebhookVerifyResult =
  | {
      ok: true;
      eventId: string;
      eventType: string;
      signatureValid: true;
      orderId?: string;
      externalId?: string;
      paymentStatus:
        | "succeeded"
        | "failed"
        | "cancelled"
        | "refunded"
        | "processing"
        | "ignored";
      amount?: number;
      metadata?: Record<string, unknown>;
    }
  | {
      ok: false;
      signatureValid: boolean;
      error: string;
      eventId?: string;
      eventType?: string;
    };

export type TestConnectionResult = {
  ok: boolean;
  message: string;
};

export type PaymentProvider = {
  id: string;
  label: LocalizedProviderLabel;
  /** Sort default when first registered into settings */
  defaultSortOrder: number;
  /** Whether this provider can take live charges today (false = admin-ready placeholder) */
  implementationReady: boolean;
  credentialFields: CredentialFieldDef[];
  /** Keys that must be non-empty for "configured" */
  requiredSecretKeys: string[];
  supportsWebhook: boolean;
  supportsRefund: boolean;
  supportsTestConnection: boolean;

  createPayment: (input: CreatePaymentInput) => Promise<CreatePaymentResult>;

  verifyWebhook?: (
    input: WebhookVerifyInput
  ) => Promise<WebhookVerifyResult>;

  testConnection?: (input: {
    secrets: Record<string, string>;
    publicConfig: Record<string, string>;
    mode: PaymentMode;
  }) => Promise<TestConnectionResult>;

  refund?: (input: {
    externalId: string;
    amount: number;
    secrets: Record<string, string>;
    publicConfig: Record<string, string>;
    mode: PaymentMode;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
};

export type PaymentProviderPublic = {
  id: string;
  label: LocalizedProviderLabel;
  enabled: boolean;
  sortOrder: number;
  configured: boolean;
  comingSoon: boolean;
  implementationReady: boolean;
  connectionStatus: string;
  webhookPath: string;
};
