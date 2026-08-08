/**
 * Issue / ensure Israeli tax documents on shop_orders.
 * Extends checkout — never blocks order placement on failure.
 */

declare global {
  var __nadeenMemoryOrders: import("@/types/shop").ShopOrder[] | undefined;
}

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isMissingColumnError } from "@/lib/supabase/errors";
import {
  getStoreSettings,
  mergeStoreSettingsPatch,
  saveStoreSettings,
} from "@/lib/store/settings";
import {
  computeVatBreakdown,
  formatInvoiceNumber,
  orderHasInvoice,
  resolveDocumentType,
  type IssuedInvoiceMeta,
} from "@/lib/shop/invoice";
import type { ShopOrder } from "@/types/shop";
import type { StoreTaxDocumentType } from "@/types/store";

const SEQUENCE_ID = "shop_orders";

async function allocateInvoiceNumber(
  prefix: string
): Promise<{ number: string; seq: number } | null> {
  if (!isSupabaseConfigured()) {
    const settings = await getStoreSettings(true);
    const seq = settings.tax.next_invoice_number;
    const number = formatInvoiceNumber(prefix || settings.tax.invoice_prefix, seq);
    await saveStoreSettings(
      mergeStoreSettingsPatch(settings, {
        tax: { ...settings.tax, next_invoice_number: seq + 1 },
      }),
      ["tax"]
    );
    return { number, seq };
  }

  const supabase = createAdminClient();

  // Prefer atomic sequence table
  const { data: seqRow, error: seqErr } = await supabase
    .from("invoice_sequence")
    .select("prefix, next_number")
    .eq("id", SEQUENCE_ID)
    .maybeSingle();

  if (!seqErr && seqRow) {
    const current = Math.max(1, Number(seqRow.next_number) || 1);
    const usePrefix = prefix || seqRow.prefix || "ND";
    const { data: updated, error: updErr } = await supabase
      .from("invoice_sequence")
      .update({
        next_number: current + 1,
        prefix: usePrefix,
        updated_at: new Date().toISOString(),
      })
      .eq("id", SEQUENCE_ID)
      .eq("next_number", current)
      .select("next_number")
      .maybeSingle();

    if (!updErr && updated) {
      return {
        number: formatInvoiceNumber(usePrefix, current),
        seq: current,
      };
    }

    // Race: re-read and retry once
    const { data: again } = await supabase
      .from("invoice_sequence")
      .select("prefix, next_number")
      .eq("id", SEQUENCE_ID)
      .maybeSingle();
    if (again) {
      const n = Math.max(1, Number(again.next_number) || 1);
      const p = prefix || again.prefix || "ND";
      await supabase
        .from("invoice_sequence")
        .update({
          next_number: n + 1,
          prefix: p,
          updated_at: new Date().toISOString(),
        })
        .eq("id", SEQUENCE_ID);
      return { number: formatInvoiceNumber(p, n), seq: n };
    }
  }

  // Fallback: store.tax.next_invoice_number when sequence table missing
  const settings = await getStoreSettings(true);
  const seq = settings.tax.next_invoice_number;
  const p = prefix || settings.tax.invoice_prefix;
  const number = formatInvoiceNumber(p, seq);
  try {
    await saveStoreSettings(
      mergeStoreSettingsPatch(settings, {
        tax: { ...settings.tax, next_invoice_number: seq + 1, invoice_prefix: p },
      }),
      ["tax"]
    );
  } catch (e) {
    console.error("[invoice] failed to bump next_invoice_number", e);
  }
  return { number, seq };
}

function buildMeta(
  allocated: { number: string },
  type: StoreTaxDocumentType,
  vat: ReturnType<typeof computeVatBreakdown>
): IssuedInvoiceMeta {
  return {
    invoice_number: allocated.number,
    invoice_type: type,
    invoice_issued_at: new Date().toISOString(),
    vat_rate: vat.rate,
    vat_amount: vat.vat,
    invoice_subtotal: vat.net,
    prices_include_vat: vat.pricesIncludeVat,
  };
}

/**
 * Issue a tax document for an order if missing.
 * Safe to call multiple times — returns existing meta when already issued.
 */
export async function ensureOrderInvoice(
  order: ShopOrder,
  options?: {
    forceType?: StoreTaxDocumentType;
    paymentReceived?: boolean;
    /** Skip issue_trigger gate (admin manual issue) */
    force?: boolean;
  }
): Promise<{ order: ShopOrder; issued: boolean; skipped?: string }> {
  if (orderHasInvoice(order)) {
    return { order, issued: false, skipped: "already_issued" };
  }

  const settings = await getStoreSettings(true);
  const tax = settings.tax;

  if (!options?.force) {
    if (tax.issue_trigger === "manual") {
      return { order, issued: false, skipped: "manual_only" };
    }
    if (
      tax.issue_trigger === "on_payment_received" &&
      options?.paymentReceived !== true &&
      order.status !== "payment_received" &&
      order.status !== "delivered" &&
      order.status !== "completed"
    ) {
      return { order, issued: false, skipped: "awaiting_payment_trigger" };
    }
  }

  const type =
    options?.forceType ??
    resolveDocumentType(tax, {
      paymentReceived:
        options?.paymentReceived === true ||
        order.status === "payment_received",
    });

  const itemsSubtotal = Number(order.total) || 0;
  // Total already includes shipping in shop_orders.total
  const vat = computeVatBreakdown(itemsSubtotal, tax);
  const allocated = await allocateInvoiceNumber(tax.invoice_prefix);
  if (!allocated) {
    return { order, issued: false, skipped: "allocate_failed" };
  }

  const meta = buildMeta(allocated, type, vat);

  if (!isSupabaseConfigured()) {
    const updated = { ...order, ...meta };
    const store = globalThis.__nadeenMemoryOrders;
    if (Array.isArray(store)) {
      const idx = store.findIndex((o) => o.id === order.id);
      if (idx >= 0) store[idx] = { ...store[idx], ...meta };
    }
    return { order: updated, issued: true };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("shop_orders")
    .update(meta)
    .eq("id", order.id)
    .is("invoice_number", null)
    .select("*")
    .maybeSingle();

  if (error) {
    if (isMissingColumnError(error)) {
      console.warn(
        "[invoice] shop_orders invoice columns missing — run APPLY_LEGAL_TAX_INVOICES.sql"
      );
      return { order, issued: false, skipped: "schema_missing" };
    }
    // Unique race: another worker issued — re-fetch
    const { data: existing } = await supabase
      .from("shop_orders")
      .select("*")
      .eq("id", order.id)
      .maybeSingle();
    if (existing?.invoice_number) {
      return {
        order: { ...order, ...(existing as ShopOrder) },
        issued: false,
        skipped: "race_existing",
      };
    }
    console.error("[invoice] update failed", error);
    return { order, issued: false, skipped: "update_failed" };
  }

  if (!data) {
    // Row already had invoice or missing
    const { data: existing } = await supabase
      .from("shop_orders")
      .select("*")
      .eq("id", order.id)
      .maybeSingle();
    if (existing?.invoice_number) {
      return {
        order: { ...order, ...(existing as ShopOrder) },
        issued: false,
        skipped: "already_issued",
      };
    }
    return { order, issued: false, skipped: "no_row" };
  }

  // Keep store.tax.next_invoice_number roughly in sync for admin UI
  try {
    const fresh = await getStoreSettings(true);
    if (fresh.tax.next_invoice_number <= allocated.seq) {
      await saveStoreSettings(
        mergeStoreSettingsPatch(fresh, {
          tax: {
            ...fresh.tax,
            next_invoice_number: allocated.seq + 1,
            invoice_prefix: tax.invoice_prefix,
          },
        }),
        ["tax"]
      );
    }
  } catch {
    /* non-fatal */
  }

  return {
    order: { ...order, ...(data as ShopOrder), ...meta },
    issued: true,
  };
}

/** Fire-and-forget wrapper for post-checkout / status hooks. */
export async function maybeIssueInvoiceAfterOrderEvent(
  order: ShopOrder,
  event: "submitted" | "payment_received"
): Promise<void> {
  try {
    if (event === "payment_received") {
      const { getCommerceSettings } = await import("@/lib/commerce/settings");
      const commerce = await getCommerceSettings(true);
      if (commerce.invoicing.auto_issue_on_payment) {
        const { afterPaymentSucceeded } = await import(
          "@/lib/invoicing/service"
        );
        await afterPaymentSucceeded(order);
        return;
      }
    }

    const settings = await getStoreSettings(true);
    const trigger = settings.tax.issue_trigger;
    if (trigger === "manual") return;
    if (event === "submitted" && trigger !== "on_order") return;
    if (event === "payment_received" && trigger === "on_order") {
      if (orderHasInvoice(order)) return;
    }
    if (event === "payment_received" && trigger === "on_payment_received") {
      await ensureOrderInvoice(order, { paymentReceived: true });
      return;
    }
    if (event === "submitted") {
      await ensureOrderInvoice(order, { paymentReceived: false });
    }
  } catch (e) {
    console.error("[invoice] maybeIssueInvoiceAfterOrderEvent failed", e);
  }
}
