/**
 * Internal Hebrew tax document — wraps existing ensureOrderInvoice + PDF.
 * Default active provider; never removed.
 */

import { buildOrderInvoicePdf } from "@/lib/shop/invoice-pdf";
import { ensureOrderInvoice } from "@/lib/shop/issue-invoice";
import { orderHasInvoice } from "@/lib/shop/invoice";
import type { InvoiceProvider, IssueInvoiceResult } from "../types";

export const internalInvoiceProvider: InvoiceProvider = {
  id: "internal",
  label: {
    ar: "فاتورة داخلية (المتجر)",
    he: "חשבונית פנימית (החנות)",
    en: "Internal store invoice",
  },
  implementationReady: true,
  credentialFields: [],
  requiredSecretKeys: [],
  supportsTestConnection: true,
  supportsTestDocument: true,

  async issueDocument(input): Promise<IssueInvoiceResult> {
    try {
      const { order: issuedOrder, issued, skipped } = await ensureOrderInvoice(
        input.order,
        { force: true, paymentReceived: true }
      );

      if (!orderHasInvoice(issuedOrder) && !issued) {
        return {
          ok: false,
          error: `Internal invoice skipped: ${skipped || "unknown"}`,
          retryable: true,
        };
      }

      const pdfBytes = await buildOrderInvoicePdf(issuedOrder, input.store);
      return {
        ok: true,
        documentNumber: issuedOrder.invoice_number || "",
        externalId: issuedOrder.invoice_number || undefined,
        pdfBytes,
        metadata: { provider: "internal", issued, skipped },
      };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Internal invoice failed",
        retryable: true,
      };
    }
  },

  async testConnection() {
    return {
      ok: true,
      message: "Internal invoicing is always available (no external API).",
    };
  },

  async testDocument(input) {
    try {
      const fakeOrder = {
        id: "00000000-0000-4000-8000-000000000001",
        name: "בדיקה",
        phone: "0500000000",
        email: "test@example.com",
        total: 100,
        items: [
          {
            product_type: "dress",
            product_id: "test",
            name_ar: "מוצר בדיקה",
            quantity: 1,
            unit_price: 100,
          },
        ],
        invoice_number: "TEST-000001",
        invoice_type: "tax_invoice_receipt",
        invoice_issued_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        status: "payment_received",
        shipping_cost: 0,
        vat_rate: input.store.tax.vat_rate,
        prices_include_vat: input.store.tax.prices_include_vat,
      };
      const pdfBytes = await buildOrderInvoicePdf(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fakeOrder as any,
        input.store
      );
      return {
        ok: true,
        documentNumber: "TEST-000001",
        pdfBytes,
        metadata: { dryRun: true },
      };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Test PDF failed",
      };
    }
  },
};
