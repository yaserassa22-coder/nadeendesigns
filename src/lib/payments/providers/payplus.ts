/**
 * PayPlus hosted payment page — PaymentProvider plugin.
 * Official API: POST /PaymentPages/generateLink
 * Verify: callback hash + POST /PaymentPages/ipn
 * Refund: POST /Transactions/RefundByTransactionUID
 *
 * Disabled by default. Admin enables under Payments & Invoicing.
 * Never collects raw card data.
 */

import { getCommerceSettings } from "@/lib/commerce/settings";
import {
  PAYPLUS_PROVIDER_ID,
  asRecord,
  callbackUrlFromReturnUrl,
  isPayPlusInvoiceModuleEnabled,
  mapPayPlusStatusCode,
  payplusOrderIdFromPayload,
  payplusPageRequestUid,
  payplusRequest,
  payplusResultsMessage,
  payplusResultsOk,
  payplusTransactionStatusCode,
  payplusTransactionUid,
  payplusInvoiceFromPayload,
  sanitizePayPlusPayload,
  verifyPayPlusCallbackHash,
} from "@/lib/payplus/client";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  TestConnectionResult,
  WebhookVerifyInput,
  WebhookVerifyResult,
} from "../types";

function authFromInput(secrets: Record<string, string>) {
  return {
    apiKey: secrets.api_key?.trim() || "",
    secretKey: secrets.secret_key?.trim() || "",
  };
}

function missingPaymentConfig(
  secrets: Record<string, string>,
  publicConfig: Record<string, string>
): string | null {
  const missing: string[] = [];
  if (!secrets.api_key?.trim()) missing.push("API Key");
  if (!secrets.secret_key?.trim()) missing.push("Secret Key");
  if (!publicConfig.payment_page_uid?.trim()) missing.push("Payment Page UID");
  return missing.length ? `Missing: ${missing.join(", ")}` : null;
}

export const payplusPaymentProvider: PaymentProvider = {
  id: PAYPLUS_PROVIDER_ID,
  label: {
    ar: "PayPlus",
    he: "PayPlus",
    en: "PayPlus",
  },
  defaultSortOrder: 3,
  implementationReady: true,
  credentialFields: [
    {
      key: "api_key",
      label: "API Key",
      label_he: "מפתח API",
      label_ar: "مفتاح API",
      kind: "secret",
      required: true,
      help: "From the PayPlus merchant dashboard. Never shared with the browser.",
    },
    {
      key: "secret_key",
      label: "Secret Key",
      label_he: "מפתח סודי",
      label_ar: "المفتاح السري",
      kind: "secret",
      required: true,
      help: "Server-side only. Used for API calls and callback HMAC verification.",
    },
    {
      key: "payment_page_uid",
      label: "Payment Page UID",
      label_he: "מזהה דף תשלום",
      label_ar: "معرّف صفحة الدفع",
      kind: "public",
      required: true,
      help: "UID of the hosted payment page in PayPlus.",
    },
    {
      key: "terminal_uid",
      label: "Terminal UID (optional)",
      label_he: "מזהה מסוף (אופציונלי)",
      kind: "public",
      required: false,
      help: "Used for Test connection (PaymentPages/list). Optional cashier/merchant terminal id.",
    },
    {
      key: "cashier_uid",
      label: "Cashier UID (optional)",
      label_he: "מזהה קופה (אופציונלי)",
      kind: "public",
      required: false,
    },
  ],
  requiredSecretKeys: ["api_key", "secret_key"],
  supportsWebhook: true,
  supportsRefund: true,
  supportsTestConnection: true,

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const missing = missingPaymentConfig(input.secrets, input.publicConfig);
    if (missing) {
      return { ok: false, error: missing, code: "payplus_not_configured" };
    }

    const commerce = await getCommerceSettings(true);
    const invoiceRow = commerce.invoicing.providers.find(
      (p) => p.id === PAYPLUS_PROVIDER_ID
    );
    const payplusIsInvoice =
      commerce.invoicing.active_provider_id === PAYPLUS_PROVIDER_ID &&
      isPayPlusInvoiceModuleEnabled(invoiceRow?.public_config || {});

    const callbackUrl = callbackUrlFromReturnUrl(input.returnUrl);
    const items = input.order.items.map((item) => ({
      name: item.name_he || item.name_en || item.name_ar || "Item",
      quantity: item.quantity,
      price: item.unit_price,
    }));
    if (input.order.shipping_cost && input.order.shipping_cost > 0) {
      items.push({
        name: "Shipping",
        quantity: 1,
        price: input.order.shipping_cost,
        shipping: true,
      } as { name: string; quantity: number; price: number; shipping: boolean });
    }

    const customer: Record<string, string> = {
      customer_name: input.order.name || "Customer",
      phone: input.order.phone || "",
    };
    if (input.order.email?.trim()) customer.email = input.order.email.trim();
    if (input.order.shipping_address) {
      customer.address = input.order.shipping_address;
    }
    if (input.order.shipping_city) customer.city = input.order.shipping_city;
    if (input.order.shipping_postal_code) {
      customer.postal_code = input.order.shipping_postal_code;
    }
    customer.country_iso = "IL";

    const body: Record<string, unknown> = {
      payment_page_uid: input.publicConfig.payment_page_uid.trim(),
      charge_method: 1,
      amount: input.amount,
      currency_code: input.currency || "ILS",
      sendEmailApproval: false,
      sendEmailFailure: false,
      language_code: "he",
      refURL_success: input.returnUrl,
      refURL_failure: input.returnUrl,
      refURL_cancel: input.cancelUrl,
      refURL_callback: callbackUrl,
      send_failure_callback: true,
      initial_invoice: payplusIsInvoice,
      more_info: input.order.id,
      customer,
      items,
    };

    try {
      const result = await payplusRequest({
        mode: input.mode,
        auth: authFromInput(input.secrets),
        method: "POST",
        path: "/PaymentPages/generateLink",
        body,
      });

      if (!result.ok || !payplusResultsOk(result.json)) {
        return {
          ok: false,
          error: payplusResultsMessage(result.json),
          code: "payplus_generate_link_failed",
        };
      }

      const data = asRecord(result.json.data) || {};
      const pageRequestUid = String(data.page_request_uid || "");
      const paymentPageLink = String(data.payment_page_link || "");
      if (!paymentPageLink) {
        return {
          ok: false,
          error: "PayPlus did not return a payment page link",
          code: "payplus_missing_link",
        };
      }

      return {
        ok: true,
        status: "requires_action",
        externalId: pageRequestUid,
        redirectUrl: paymentPageLink,
        metadata: {
          page_request_uid: pageRequestUid,
          initial_invoice: payplusIsInvoice,
        },
      };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "PayPlus request failed",
        code: "payplus_network_error",
      };
    }
  },

  async verifyWebhook(input: WebhookVerifyInput): Promise<WebhookVerifyResult> {
    const secret = input.secrets.secret_key?.trim() || "";
    if (!secret) {
      return {
        ok: false,
        signatureValid: false,
        error: "PayPlus secret key is not configured",
      };
    }

    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(input.rawBody) as Record<string, unknown>;
    } catch {
      return {
        ok: false,
        signatureValid: false,
        error: "Invalid JSON payload",
      };
    }

    const hashPresent = Boolean(input.headers["hash"]?.trim());
    const signatureValid = hashPresent
      ? verifyPayPlusCallbackHash({
          rawBody: input.rawBody,
          headers: input.headers,
          secretKey: secret,
        })
      : false;

    if (hashPresent && !signatureValid) {
      return {
        ok: false,
        signatureValid: false,
        error: "Invalid PayPlus callback signature",
      };
    }

    const pageRequestUid = payplusPageRequestUid(payload);
    const transactionUid = payplusTransactionUid(payload);
    if (!pageRequestUid && !transactionUid) {
      return {
        ok: false,
        signatureValid: signatureValid || !hashPresent,
        error: "Missing payment_request_uid / transaction_uid",
      };
    }

    const auth = authFromInput(input.secrets);
    let ipnJson: Record<string, unknown> = {};
    try {
      const ipnBody: Record<string, unknown> = {};
      if (pageRequestUid) ipnBody.payment_request_uid = pageRequestUid;
      if (transactionUid) ipnBody.transaction_uid = transactionUid;
      const ipn = await payplusRequest({
        mode: input.mode,
        auth,
        method: "POST",
        path: "/PaymentPages/ipn",
        body: ipnBody,
      });
      ipnJson = ipn.json;
      if (ipn.status === 401 || ipn.status === 403) {
        return {
          ok: false,
          signatureValid,
          error: "PayPlus IPN authentication failed",
        };
      }
      if (!ipn.ok && ipn.status >= 500) {
        return {
          ok: false,
          signatureValid,
          error: "ipn_unavailable",
        };
      }
    } catch {
      return {
        ok: false,
        signatureValid,
        error: "ipn_unavailable",
      };
    }

    const ipnData = asRecord(ipnJson.data) || ipnJson;
    const statusCode =
      payplusTransactionStatusCode(ipnData) ||
      payplusTransactionStatusCode(payload);
    const paymentStatus = mapPayPlusStatusCode(statusCode);
    const confirmedUid =
      payplusTransactionUid(ipnData) || transactionUid || pageRequestUid;
    const orderId =
      payplusOrderIdFromPayload(ipnData) || payplusOrderIdFromPayload(payload);
    const invoice =
      payplusInvoiceFromPayload(payload) || payplusInvoiceFromPayload(ipnData);
    const eventId = confirmedUid || pageRequestUid || `payplus-${Date.now()}`;

    return {
      ok: true,
      eventId,
      eventType:
        paymentStatus === "succeeded"
          ? "PAYMENT_VERIFIED"
          : paymentStatus === "failed"
            ? "PAYMENT_FAILED"
            : paymentStatus === "cancelled"
              ? "PAYMENT_CANCELLED"
              : "PAYMENT_CALLBACK_RECEIVED",
      signatureValid: true,
      orderId,
      externalId: confirmedUid,
      paymentStatus,
      metadata: sanitizePayPlusPayload({
        page_request_uid: pageRequestUid,
        transaction_uid: confirmedUid,
        status_code: statusCode,
        invoice,
      }) as Record<string, unknown>,
    };
  },

  async testConnection(input): Promise<TestConnectionResult> {
    const missing = missingPaymentConfig(input.secrets, input.publicConfig);
    if (missing) {
      return { ok: false, message: missing };
    }

    const auth = authFromInput(input.secrets);
    const terminalUid = input.publicConfig.terminal_uid?.trim();

    try {
      if (terminalUid) {
        const list = await payplusRequest({
          mode: input.mode,
          auth,
          method: "GET",
          path: `/PaymentPages/list/?terminal_uid=${encodeURIComponent(terminalUid)}`,
        });
        if (list.status === 401 || list.status === 403) {
          return { ok: false, message: "Connection failed (invalid credentials)." };
        }
        if (list.ok || list.status === 200) {
          return { ok: true, message: "Connection successful" };
        }
        return {
          ok: false,
          message: payplusResultsMessage(list.json) || `Connection failed (${list.status})`,
        };
      }

      const probe = await payplusRequest({
        mode: input.mode,
        auth,
        method: "POST",
        path: "/PaymentPages/ipn",
        body: {
          payment_request_uid: "00000000-0000-0000-0000-000000000000",
        },
      });
      if (probe.status === 401 || probe.status === 403) {
        return { ok: false, message: "Connection failed (invalid credentials)." };
      }
      if (probe.status === 0) {
        return { ok: false, message: "Connection failed" };
      }
      return {
        ok: true,
        message: "Connection successful",
      };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : "Connection failed",
      };
    }
  },

  async refund(input) {
    const auth = authFromInput(input.secrets);
    if (!auth.apiKey || !auth.secretKey) {
      return { ok: false, error: "PayPlus credentials are not configured" };
    }
    if (!input.externalId?.trim()) {
      return { ok: false, error: "Missing PayPlus transaction UID" };
    }

    try {
      const result = await payplusRequest({
        mode: input.mode,
        auth,
        method: "POST",
        path: "/Transactions/RefundByTransactionUID",
        body: {
          transaction_uid: input.externalId.trim(),
          amount: input.amount,
          initial_invoice: false,
        },
      });
      if (!result.ok || !payplusResultsOk(result.json)) {
        return { ok: false, error: payplusResultsMessage(result.json) };
      }
      const statusCode = payplusTransactionStatusCode(result.json);
      if (statusCode && statusCode !== "000") {
        return { ok: false, error: `PayPlus refund status ${statusCode}` };
      }
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "PayPlus refund failed",
      };
    }
  },
};
