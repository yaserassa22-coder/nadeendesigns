import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  getErrorMessage,
  isMissingTableError,
  missingShopSchemaMessage,
} from "@/lib/supabase/errors";
import {
  ORDER_SELECT_CORE,
  ORDER_SELECT_FULL,
  ORDER_SELECT_FULL_LEGACY,
  ORDER_SELECT_FULL_M9,
  ORDER_SELECT_FULL_M9_INVOICE,
  ORDER_SELECT_FULL_WITH_INVOICE_LEGACY,
  isOrderSchemaError,
  normalizeShopOrderRow,
} from "@/lib/shop/order-query";
import { ensureOrderInvoice } from "@/lib/shop/issue-invoice";
import { buildOrderInvoicePdf } from "@/lib/shop/invoice-pdf";
import { getStoreSettings } from "@/lib/store/settings";
import { orderHasInvoice } from "@/lib/shop/invoice";
import type { ShopOrder } from "@/types/shop";

declare global {
  var __nadeenMemoryOrders: ShopOrder[] | undefined;
}

function memoryOrders(): ShopOrder[] {
  if (!globalThis.__nadeenMemoryOrders) globalThis.__nadeenMemoryOrders = [];
  return globalThis.__nadeenMemoryOrders;
}

async function loadOrder(id: string): Promise<ShopOrder | null> {
  if (!isSupabaseConfigured()) {
    return memoryOrders().find((o) => o.id === id) ?? null;
  }

  const supabase = createAdminClient();
  const attempts = [
    ORDER_SELECT_FULL,
    ORDER_SELECT_FULL_M9_INVOICE,
    ORDER_SELECT_FULL_WITH_INVOICE_LEGACY,
    ORDER_SELECT_FULL_M9,
    ORDER_SELECT_FULL_LEGACY,
    ORDER_SELECT_CORE,
  ] as const;

  for (const cols of attempts) {
    const { data, error } = await supabase
      .from("shop_orders")
      .select(cols as "*")
      .eq("id", id)
      .maybeSingle();
    if (!error && data) return normalizeShopOrderRow(data as Record<string, unknown>);
    if (error && isMissingTableError(error)) {
      throw new Error(missingShopSchemaMessage());
    }
    if (error && !isOrderSchemaError(error)) {
      throw error;
    }
  }
  return null;
}

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/orders/[id]/invoice
 * Returns PDF (default) or JSON metadata (?format=json).
 * Public: anyone with order id (same as tracking). Admin can force issue.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "معرّف الطلب غير صالح" }, { status: 400 });
    }

    const format = request.nextUrl.searchParams.get("format") || "pdf";
    const issue = request.nextUrl.searchParams.get("issue") === "1";

    let order = await loadOrder(id);
    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    if (!orderHasInvoice(order) || issue) {
      const admin = await requireAdminApi();
      const canForce = !admin.error && issue;
      if (!orderHasInvoice(order)) {
        // Customers get auto-issue when trigger allows; admins can force
        const result = await ensureOrderInvoice(order, {
          force: canForce,
          paymentReceived:
            order.status === "payment_received" ||
            order.status === "delivered" ||
            order.status === "completed",
        });
        order = result.order;
      } else if (canForce) {
        // already has invoice — no re-number
      }
    }

    if (!orderHasInvoice(order)) {
      return NextResponse.json(
        {
          error:
            "لم يُصدر المستند الضريبي بعد. يمكن للإدارة إصداره من الطلبات أو ضبط توقيت الإصدار في إعدادات الضرائب.",
          order_id: order.id,
        },
        { status: 409 }
      );
    }

    if (format === "json") {
      return NextResponse.json({
        invoice_number: order.invoice_number,
        invoice_type: order.invoice_type,
        invoice_issued_at: order.invoice_issued_at,
        vat_rate: order.vat_rate,
        vat_amount: order.vat_amount,
        invoice_subtotal: order.invoice_subtotal,
        prices_include_vat: order.prices_include_vat,
        order_id: order.id,
      });
    }

    const store = await getStoreSettings(true);
    const pdf = await buildOrderInvoicePdf(order, store);
    const filename = `${order.invoice_number || "invoice"}.pdf`;

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("[invoice API]", e);
    return NextResponse.json(
      { error: getErrorMessage(e) || "فشل إنشاء المستند" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders/[id]/invoice — admin: force issue document
 */
export async function POST(_request: NextRequest, context: RouteContext) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const { id } = await context.params;
    let order = await loadOrder(id);
    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    const result = await ensureOrderInvoice(order, { force: true });
    return NextResponse.json({
      success: true,
      issued: result.issued,
      skipped: result.skipped,
      invoice_number: result.order.invoice_number,
      invoice_type: result.order.invoice_type,
      invoice_issued_at: result.order.invoice_issued_at,
      order: result.order,
    });
  } catch (e) {
    return NextResponse.json(
      { error: getErrorMessage(e) || "فشل إصدار المستند" },
      { status: 500 }
    );
  }
}
