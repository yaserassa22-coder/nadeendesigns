/**
 * PayPlus Invoice+ — InvoiceProvider plugin.
 *
 * When PayPlus also handled payment (initial_invoice on generateLink), attach
 * the existing PayPlus document — do not create a second invoice.
 * When another PSP collected payment, create a document via
 * POST /books/docs/new/{docType}.
 *
 * Selectable as the active invoice provider only when the invoice module is
 * enabled in Admin (merchant Invoice+ entitlement).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  getCommerceMode,
  getCommerceSettings,
} from "@/lib/commerce/settings";
import {
  PAYPLUS_INVOICE_NOT_CONFIGURED,
  PAYPLUS_PROVIDER_ID,
  asRecord,
  isPayPlusInvoiceModuleEnabled,
  payplusRequest,
  payplusResultsMessage,
  resolvePayPlusDocType,
} from "@/lib/payplus/client";
import {
  payplusAuthConfigured,
  resolvePayPlusAuth,
} from "@/lib/payplus/secrets";
import type { ShopOrder } from "@/types/shop";
import type {
  InvoiceProvider,
  IssueInvoiceInput,
  IssueInvoiceResult,
  TestInvoiceConnectionResult,
} from "../types";

function invoiceSelectable(publicConfig: Record<string, string>): boolean {
  return isPayPlusInvoiceModuleEnabled(publicConfig);
}

async function findPayPlusPayment(orderId: string): Promise<{
  transactionUid: string;
  pageRequestUid: string;
  initialInvoice: boolean;
  invoice?: Record<string, unknown> | null;
} | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("payment_transactions")
      .select("external_id, metadata")
      .eq("order_id", orderId)
      .eq("provider_id", PAYPLUS_PROVIDER_ID)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    const metadata = asRecord(data.metadata) || {};
    const invoice = asRecord(metadata.invoice);
    return {
      transactionUid: String(
        metadata.transaction_uid || data.external_id || ""
      ),
      pageRequestUid: String(
        metadata.page_request_uid || data.external_id || ""
      ),
      initialInvoice: metadata.initial_invoice === true,
      invoice,
    };
  } catch {
    return null;
  }
}

function attachFromInvoiceObject(
  invoice: Record<string, unknown>
): IssueInvoiceResult | null {
  const number = String(
    invoice.docu_number ||
      invoice.document_number ||
      invoice.number ||
      invoice.uuid ||
      ""
  );
  const url = String(
    invoice.original_url ||
      invoice.original_doc_url ||
      invoice.copy_url ||
      invoice.copy_doc_url ||
      ""
  );
  if (!number && !url) return null;
  return {
    ok: true,
    documentNumber: number || "payplus",
    externalId: String(invoice.uuid || invoice.docUID || number),
    pdfUrl: url || undefined,
    metadata: { source: "payplus_payment_invoice", invoice },
  };
}

function orderItems(order: ShopOrder) {
  const items = order.items.map((item) => ({
    name: item.name_he || item.name_en || item.name_ar || "Item",
    quantity: item.quantity,
    price: item.unit_price,
    currency_code: "ILS",
  }));
  if (order.shipping_cost && order.shipping_cost > 0) {
    items.push({
      name: "Shipping",
      quantity: 1,
      price: order.shipping_cost,
      currency_code: "ILS",
    });
  }
  return items;
}

function paymentTypeForOrder(order: ShopOrder): {
  payment_type: string;
  payment_app?: string;
} {
  const id = order.payment_provider_id || "";
  if (id === "cod") return { payment_type: "cash" };
  if (id === "paypal") return { payment_type: "paypal" };
  if (id === "bit") return { payment_type: "payment-app", payment_app: "bit" };
  if (id === "apple_pay") {
    return { payment_type: "payment-app", payment_app: "apple-pay" };
  }
  if (id === "google_pay") {
    return { payment_type: "payment-app", payment_app: "google-pay" };
  }
  if (id === PAYPLUS_PROVIDER_ID || id === "credit_card") {
    return { payment_type: "credit-card" };
  }
  return { payment_type: "other" };
}

export const payplusInvoiceProvider: InvoiceProvider = {
  id: PAYPLUS_PROVIDER_ID,
  label: {
    ar: "PayPlus",
    he: "PayPlus",
    en: "PayPlus",
  },
  implementationReady: true,
  credentialFields: [
    {
      key: "api_key",
      label: "API Key",
      label_he: "מפתח API",
      kind: "secret",
      required: false,
      help: "Leave blank to reuse the PayPlus API Key saved under Payment providers.",
    },
    {
      key: "secret_key",
      label: "Secret Key",
      label_he: "מפתח סודי",
      kind: "secret",
      required: false,
      help: "Leave blank to reuse the PayPlus Secret Key saved under Payment providers.",
    },
    {
      key: "invoice_module_enabled",
      label: "Invoice module enabled on PayPlus account",
      label_he: "מודול חשבוניות מופעל בחשבון PayPlus",
      kind: "public",
      inputType: "checkbox",
      required: true,
      help: "Turn on only after PayPlus Invoice+ / invoicing is enabled on the merchant account. Required before selecting PayPlus as the active invoice provider.",
    },
    {
      key: "document_type",
      label: "Document type",
      label_he: "סוג מסמך",
      kind: "public",
      required: false,
      help: "inv_tax_receipt (default), inv_tax, or inv_receipt. Used when PayPlus creates a standalone invoice (other payment provider).",
    },
  ],
  requiredSecretKeys: [],
  supportsTestConnection: true,
  supportsTestDocument: true,

  async issueDocument(input: IssueInvoiceInput): Promise<IssueInvoiceResult> {
    if (!invoiceSelectable(input.publicConfig)) {
      return {
        ok: false,
        error: PAYPLUS_INVOICE_NOT_CONFIGURED,
        retryable: false,
      };
    }

    const auth = await resolvePayPlusAuth({ invoiceSecrets: input.secrets });
    if (!payplusAuthConfigured(auth)) {
      return {
        ok: false,
        error: PAYPLUS_INVOICE_NOT_CONFIGURED,
        retryable: false,
      };
    }

    const existing = await findPayPlusPayment(input.order.id);
    if (existing?.invoice) {
      const attached = attachFromInvoiceObject(existing.invoice);
      if (attached) return attached;
    }

    const today = new Date();
    const iso = today.toISOString().slice(0, 10);
    const from = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const until = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const commerce = await getCommerceSettings(true);
    const mode = getCommerceMode(commerce);

    if (existing?.transactionUid) {
      try {
        const docs = await payplusRequest({
          mode,
          auth,
          method: "POST",
          path: "/Invoice/GetDocuments",
          body: {
            transaction_uid: existing.transactionUid,
            filter: { fromDate: from, untilDate: until },
          },
        });
        const invoices = Array.isArray(docs.json.invoices)
          ? docs.json.invoices
          : [];
        const first = invoices.find(
          (row) => asRecord(row)?.status === "success"
        );
        const rec = asRecord(first);
        if (rec) {
          const attached = attachFromInvoiceObject(rec);
          if (attached) return attached;
        }
      } catch {
        /* invoice may not be ready yet */
      }
      if (existing.initialInvoice) {
        return {
          ok: false,
          error:
            "PayPlus invoice is not ready yet for this payment. Retry shortly.",
          retryable: true,
        };
      }
    }

    const docType = resolvePayPlusDocType(input.publicConfig);
    const customerEmail =
      input.order.email?.trim() ||
      `order-${input.order.id.replace(/[^a-zA-Z0-9-]/g, "")}@customers.local`;
    const pay = paymentTypeForOrder(input.order);
    const body: Record<string, unknown> = {
      doc_date: iso,
      more_info: input.order.id,
      send_document_email: Boolean(input.invoicing.auto_email_on_issue),
      customer: {
        name: input.order.name || "Customer",
        customer_name: input.order.name || "Customer",
        email: customerEmail,
        phone: input.order.phone || "",
        city: input.order.shipping_city || "",
        street_name: input.order.shipping_address || "",
        postal_code: input.order.shipping_postal_code || "",
        country_ISO: "IL",
      },
      items: orderItems(input.order),
      totalAmount: input.order.total,
      payments: [
        {
          payment_type: pay.payment_type,
          ...(pay.payment_app ? { payment_app: pay.payment_app } : {}),
          amount: input.order.total,
          currency_code: "ILS",
          payment_date: iso,
          description: `Order ${input.order.id}`,
        },
      ],
    };
    if (existing?.transactionUid) {
      body.transaction_uuid = existing.transactionUid;
    }

    try {
      const created = await payplusRequest({
        mode,
        auth,
        method: "POST",
        path: `/books/docs/new/${docType}`,
        body,
      });

      if (!created.ok || created.json.validDocumentGenerated === false) {
        const retryable = created.status >= 500;
        return {
          ok: false,
          error:
            payplusResultsMessage(created.json) ||
            "PayPlus document creation failed",
          retryable,
        };
      }

      const number = String(
        created.json.number || created.json.docUID || input.order.id
      );
      const pdfUrl = String(
        created.json.originalDocAddress ||
          created.json.copyDocAddress ||
          ""
      );
      return {
        ok: true,
        documentNumber: number,
        externalId: String(created.json.docUID || number),
        pdfUrl: pdfUrl || undefined,
        metadata: {
          source: "payplus_books_docs_new",
          doc_type: docType,
        },
      };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "PayPlus invoice request failed",
        retryable: true,
      };
    }
  },

  async testConnection(input): Promise<TestInvoiceConnectionResult> {
    if (!invoiceSelectable(input.publicConfig)) {
      return { ok: false, message: PAYPLUS_INVOICE_NOT_CONFIGURED };
    }
    const auth = await resolvePayPlusAuth({ invoiceSecrets: input.secrets });
    if (!payplusAuthConfigured(auth)) {
      return { ok: false, message: PAYPLUS_INVOICE_NOT_CONFIGURED };
    }

    try {
      const commerce = await getCommerceSettings(true);
      const mode = getCommerceMode(commerce);
      const today = new Date().toISOString().slice(0, 10);

      if (auth.terminalUid) {
        const list = await payplusRequest({
          mode,
          auth,
          method: "GET",
          path: `/PaymentPages/list/?terminal_uid=${encodeURIComponent(auth.terminalUid)}`,
        });
        if (list.status === 401 || list.status === 403) {
          return { ok: false, message: "Connection failed (invalid credentials)." };
        }
        if (list.ok) return { ok: true, message: "Connection successful" };
      }

      const probe = await payplusRequest({
        mode,
        auth,
        method: "GET",
        path: `/books/docs/list?fromDate=${today}&untilDate=${today}&take=1`,
      });
      if (probe.status === 401 || probe.status === 403) {
        return { ok: false, message: "Connection failed (invalid credentials)." };
      }
      return { ok: true, message: "Connection successful" };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : "Connection failed",
      };
    }
  },

  async testDocument(input): Promise<IssueInvoiceResult> {
    if (!invoiceSelectable(input.publicConfig)) {
      return { ok: false, error: PAYPLUS_INVOICE_NOT_CONFIGURED };
    }
    const auth = await resolvePayPlusAuth({ invoiceSecrets: input.secrets });
    if (!payplusAuthConfigured(auth)) {
      return { ok: false, error: PAYPLUS_INVOICE_NOT_CONFIGURED };
    }

    const docType = resolvePayPlusDocType(input.publicConfig);
    const commerce = await getCommerceSettings(true);
    const mode = getCommerceMode(commerce);
    const iso = new Date().toISOString().slice(0, 10);

    try {
      const result = await payplusRequest({
        mode,
        auth,
        method: "POST",
        path: `/books/docs/new/${docType}`,
        body: {
          doc_date: iso,
          preview: true,
          more_info: "nadeen-test-invoice",
          customer: {
            name: input.store.general.store_name || "Nadeen Designs",
            customer_name: input.store.general.store_name || "Nadeen Designs",
            email: "test@example.com",
          },
          items: [
            {
              name: "Test item",
              quantity: 1,
              price: 1,
              currency_code: "ILS",
            },
          ],
        },
      });
      if (result.status === 401 || result.status === 403) {
        return { ok: false, error: "Connection failed (invalid credentials)." };
      }
      if (!result.ok) {
        return { ok: false, error: payplusResultsMessage(result.json) };
      }
      return {
        ok: true,
        documentNumber: String(result.json.number || "preview"),
        metadata: { preview: true },
      };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "PayPlus test document failed",
      };
    }
  },
};
