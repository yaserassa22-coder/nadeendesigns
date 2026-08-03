import { NextResponse, after } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getErrorCode,
  getErrorMessage,
  isMissingTableError,
  missingShopSchemaMessage,
} from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import {
  onOrderStatusChanged,
  onOrderSubmitted,
} from "@/lib/notifications/service";
import { shopOrderCreateSchema } from "@/lib/validations/shop-product";
import { cartNeedsShipping } from "@/lib/shop/shipping";
import {
  ORDER_WORKFLOW_ACTIONS,
  SHOP_ORDER_STATUSES,
  type OrderWorkflowAction,
  type ShopOrder,
  type ShopOrderStatus,
} from "@/types/shop";

const memoryOrders: ShopOrder[] = [];

function mapOrderError(error: unknown): { message: string; status: number } {
  const raw = getErrorMessage(error);
  const code = getErrorCode(error);

  console.error("[orders API]", { code, raw, error });

  if (isMissingTableError(error, "shop_orders")) {
    return { status: 503, message: missingShopSchemaMessage() };
  }

  if (code === "42501" || /row-level security/i.test(raw)) {
    return {
      status: 403,
      message:
        "تم رفض حفظ الطلب بسبب صلاحيات قاعدة البيانات (RLS). تأكدي من تطبيق سياسة الإدراج العامة على جدول shop_orders عبر APPLY_SHOP_CHECKOUT.sql.",
    };
  }

  if (code === "23514" || /check constraint/i.test(raw)) {
    return {
      status: 400,
      message:
        "بيانات الطلب لا تطابق قيود قاعدة البيانات. نفّذي supabase/APPLY_NOTIFICATIONS.sql لتحديث حالات الطلب.",
    };
  }

  if (raw.trim()) {
    return { status: 400, message: `فشل حفظ الطلب: ${raw}` };
  }

  return { status: 500, message: "فشل حفظ الطلب لسبب غير معروف. راجعي سجل الخادم." };
}

function isValidStatus(status: string): status is ShopOrderStatus {
  return (SHOP_ORDER_STATUSES as string[]).includes(status) || status === "completed";
}

function resolveStatusFromBody(body: {
  status?: string;
  action?: string;
}): ShopOrderStatus | null {
  if (body.status && isValidStatus(body.status)) return body.status;
  if (body.action) {
    const found = ORDER_WORKFLOW_ACTIONS.find(
      (a) => a.action === (body.action as OrderWorkflowAction)
    );
    if (found) return found.status;
  }
  return null;
}

function scheduleNotifications(task: () => Promise<void>) {
  try {
    after(async () => {
      try {
        await task();
      } catch (e) {
        console.error("[orders API] notification task failed", e);
      }
    });
  } catch {
    void task().catch((e) =>
      console.error("[orders API] notification task failed", e)
    );
  }
}

export async function GET() {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(memoryOrders);
  }

  try {
    const supabase = await createPrivilegedClient();
    const { data, error } = await supabase
      .from("shop_orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      const mapped = mapOrderError(error);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
    return NextResponse.json(data ?? []);
  } catch (e) {
    const mapped = mapOrderError(e);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    console.info("[orders API] incoming checkout payload", {
      name: json?.name,
      phone: json?.phone,
      itemsCount: Array.isArray(json?.items) ? json.items.length : 0,
      total: json?.total,
      hasGift: Boolean(json?.gift_options),
    });

    const parsed = shopOrderCreateSchema.safeParse(json);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path = issue?.path?.join(".") || "البيانات";
      const detail = issue?.message || "بيانات غير صالحة";
      console.error("[orders API] validation failed", parsed.error.issues);
      return NextResponse.json(
        { error: `تحقق من الحقول: ${path} — ${detail}` },
        { status: 400 }
      );
    }

    const body = parsed.data;
    const needsShipping =
      body.shipping_required === true || cartNeedsShipping(body.items);
    const shipping = needsShipping ? body.shipping : null;
    const shippingCost =
      needsShipping && typeof body.shipping_cost === "number"
        ? body.shipping_cost
        : 0;

    const id = crypto.randomUUID();
    const created_at = new Date().toISOString();
    const row: ShopOrder = {
      id,
      name: body.name.trim(),
      phone: body.phone.trim(),
      email: body.email?.trim() ? body.email.trim() : null,
      notes: body.notes?.trim() ? body.notes.trim() : null,
      items: body.items.map((i) => ({
        ...i,
        image: i.image ?? undefined,
      })),
      gift_options: body.gift_options ?? null,
      total: body.total,
      status: "pending",
      created_at,
      shipping_required: needsShipping,
      shipping_full_name: shipping?.full_name?.trim() || null,
      shipping_phone: shipping?.phone?.trim() || null,
      shipping_city: shipping?.city?.trim() || null,
      shipping_region: shipping?.region?.trim() || null,
      shipping_address: shipping?.address?.trim() || null,
      shipping_postal_code: shipping?.postal_code?.trim() || null,
      shipping_notes: shipping?.notes?.trim() || null,
      shipping_cost: shippingCost,
    };

    if (!isSupabaseConfigured()) {
      memoryOrders.unshift(row);
      console.info("[orders API] saved to memory (Supabase not configured)", row.id);
      scheduleNotifications(() => onOrderSubmitted(row));
      return NextResponse.json({ success: true, order: row });
    }

    const supabase = createAdminClient();
    const insertFull = {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      notes: row.notes,
      items: row.items,
      gift_options: row.gift_options,
      total: row.total,
      status: row.status,
      shipping_required: row.shipping_required,
      shipping_full_name: row.shipping_full_name,
      shipping_phone: row.shipping_phone,
      shipping_city: row.shipping_city,
      shipping_region: row.shipping_region,
      shipping_address: row.shipping_address,
      shipping_postal_code: row.shipping_postal_code,
      shipping_notes: row.shipping_notes,
      shipping_cost: row.shipping_cost,
    };

    let { error } = await supabase.from("shop_orders").insert(insertFull);

    // Migration not applied yet — fall back without shipping columns
    if (
      error &&
      /shipping_|column .* does not exist/i.test(getErrorMessage(error))
    ) {
      console.warn(
        "[orders API] shipping columns missing — inserting without them. Run APPLY_SHOP_SHIPPING.sql"
      );
      const retry = await supabase.from("shop_orders").insert({
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        notes: row.notes,
        items: row.items,
        gift_options: row.gift_options,
        total: row.total,
        status: row.status,
      });
      error = retry.error;
    }

    if (error) {
      const mapped = mapOrderError(error);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }

    console.info("[orders API] order saved", row.id);
    scheduleNotifications(() => onOrderSubmitted(row));
    return NextResponse.json({ success: true, order: row });
  } catch (e) {
    if (e instanceof z.ZodError) {
      console.error("[orders API] zod error", e.issues);
      return NextResponse.json(
        { error: e.issues[0]?.message ?? "بيانات الطلب غير صالحة" },
        { status: 400 }
      );
    }
    const mapped = mapOrderError(e);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}

export async function PATCH(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  try {
    const body = (await request.json()) as {
      id?: string;
      status?: ShopOrderStatus;
      action?: OrderWorkflowAction;
      paymentAmount?: number;
    };

    if (!body.id) {
      return NextResponse.json({ error: "معرّف الطلب مطلوب" }, { status: 400 });
    }

    const status = resolveStatusFromBody(body);
    if (!status) {
      return NextResponse.json(
        { error: "حالة الطلب أو الإجراء غير صالح" },
        { status: 400 }
      );
    }

    const paymentAmount =
      typeof body.paymentAmount === "number" && body.paymentAmount > 0
        ? body.paymentAmount
        : undefined;

    if (!isSupabaseConfigured()) {
      const idx = memoryOrders.findIndex((o) => o.id === body.id);
      if (idx < 0) {
        return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
      }
      const previous = memoryOrders[idx].status;
      if (previous === status) {
        return NextResponse.json({
          success: true,
          unchanged: true,
          message: "لم تتغير الحالة — لم تُرسل إشعارات",
        });
      }
      memoryOrders[idx] = { ...memoryOrders[idx], status };
      const order = memoryOrders[idx];
      scheduleNotifications(() =>
        onOrderStatusChanged(order, previous, status, { paymentAmount })
      );
      return NextResponse.json({ success: true, status });
    }

    const supabase = await createPrivilegedClient();
    const { data: existing, error: fetchError } = await supabase
      .from("shop_orders")
      .select("*")
      .eq("id", body.id)
      .maybeSingle();

    if (fetchError) {
      const mapped = mapOrderError(fetchError);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
    if (!existing) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    const previous = existing.status as ShopOrderStatus;
    if (previous === status) {
      return NextResponse.json({
        success: true,
        unchanged: true,
        message: "لم تتغير الحالة — لم تُرسل إشعارات",
      });
    }

    const { error } = await supabase
      .from("shop_orders")
      .update({ status })
      .eq("id", body.id);
    if (error) {
      const mapped = mapOrderError(error);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }

    const order = { ...(existing as ShopOrder), status };
    scheduleNotifications(() =>
      onOrderStatusChanged(order, previous, status, { paymentAmount })
    );
    return NextResponse.json({ success: true, status });
  } catch (e) {
    const mapped = mapOrderError(e);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
