import { NextResponse, after } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getErrorCode,
  getErrorMessage,
  isCheckConstraintError,
  isMissingTableError,
  isShopOrdersStatusCheckError,
  missingShopSchemaMessage,
} from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import {
  onOrderStatusChanged,
  onOrderSubmitted,
} from "@/lib/notifications/service";
import { shopOrderCreateSchema } from "@/lib/validations/shop-product";
import {
  isOrderSchemaError,
  isShippingRegionFkError,
  selectShopOrdersList,
} from "@/lib/shop/order-query";
import {
  buildProgressiveInsertPayloads,
  buildShopOrderRow,
  DELIVERY_PERSIST_KEYS,
  matchShippingRegion,
  resolveDeliveryShipping,
  resolveNeedsShipping,
  type RegionMatch,
} from "@/lib/shop/order-insert";
import { isValidCheckoutPhone, isValidPersonName } from "@/lib/phone";
import { normalizeSiteSettings } from "@/lib/settings";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import {
  ORDER_WORKFLOW_ACTIONS,
  SHOP_ORDER_STATUSES,
  type DeliveryMethod,
  type OrderWorkflowAction,
  type ShopOrder,
  type ShopOrderStatus,
} from "@/types/shop";
import type { SiteSettings } from "@/types";

declare global {
  var __nadeenMemoryOrders: ShopOrder[] | undefined;
}

function memoryOrdersStore(): ShopOrder[] {
  if (!globalThis.__nadeenMemoryOrders) globalThis.__nadeenMemoryOrders = [];
  return globalThis.__nadeenMemoryOrders;
}

async function loadSiteSettingsForShipping(): Promise<SiteSettings> {
  if (!isSupabaseConfigured()) {
    return normalizeSiteSettings(DEFAULT_SETTINGS);
  }
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "site")
      .single();
    if (error || !data?.value) return normalizeSiteSettings(DEFAULT_SETTINGS);
    return normalizeSiteSettings(data.value as SiteSettings);
  } catch {
    return normalizeSiteSettings(DEFAULT_SETTINGS);
  }
}

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

  // Only blame APPLY_NOTIFICATIONS when the failing CHECK is status enum —
  // other 23514s (e.g. delivery_method) must not get a false migration hint.
  if (isShopOrdersStatusCheckError(error)) {
    return {
      status: 400,
      message:
        "بيانات الطلب لا تطابق قيود قاعدة البيانات. نفّذي supabase/APPLY_NOTIFICATIONS.sql (أو قسم حالات الطلب في APPLY_MISSING_MIGRATIONS.sql) لتحديث حالات الطلب.",
    };
  }
  if (isCheckConstraintError(error)) {
    return {
      status: 400,
      message: raw.trim()
        ? `بيانات الطلب لا تطابق قيود قاعدة البيانات: ${raw}`
        : "بيانات الطلب لا تطابق قيود قاعدة البيانات.",
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
    return NextResponse.json(memoryOrdersStore());
  }

  try {
    const supabase = await createPrivilegedClient();
    const { data, error } = await selectShopOrdersList(supabase);
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
    // Accessories from line items, OR an explicit checkout delivery choice.
    // Never trust client shipping_required:false to skip accessories — but DO
    // honor delivery_method when the customer selected pickup/delivery so we
    // never drop shipping fields after a false-negative accessory detection.
    const needsShipping = resolveNeedsShipping(body);
    const siteSettings = await loadSiteSettingsForShipping();

    let deliveryMethod: DeliveryMethod | null = null;
    let matched: RegionMatch | null = null;
    let regionMatchSource: "db" | "seed" | null = null;
    let regionText = "";

    if (needsShipping) {
      const method = body.delivery_method;
      const pickupOk = siteSettings.boutique_pickup_enabled !== false;
      const deliveryOk = siteSettings.delivery_enabled !== false;

      if (method !== "pickup" && method !== "delivery") {
        return NextResponse.json(
          { error: "يرجى اختيار طريقة الاستلام (من البوتيك أو التوصيل)." },
          { status: 400 }
        );
      }
      if (method === "pickup" && !pickupOk) {
        return NextResponse.json(
          { error: "الاستلام من البوتيك غير متاح حالياً." },
          { status: 400 }
        );
      }
      if (method === "delivery" && !deliveryOk) {
        return NextResponse.json(
          { error: "التوصيل غير متاح حالياً." },
          { status: 400 }
        );
      }
      deliveryMethod = method;

      if (method === "delivery") {
        const ship = body.shipping;
        if (
          !ship ||
          !isValidPersonName(ship.full_name) ||
          !isValidCheckoutPhone(ship.phone) ||
          ship.city.trim().length < 2 ||
          ship.address.trim().length < 5
        ) {
          return NextResponse.json(
            {
              error:
                "بيانات التوصيل مطلوبة (الاسم، الهاتف، البلدة / المدينة، والعنوان).",
            },
            { status: 400 }
          );
        }
        regionText = ship.region?.trim() || "";
        const regionIdHint = ship.shipping_region_id?.trim() || null;
        if (!regionIdHint && regionText.length < 2) {
          return NextResponse.json(
            { error: "المنطقة / المدينة مطلوبة للتوصيل." },
            { status: 400 }
          );
        }

        let dbRows: RegionMatch[] | null = null;
        if (isSupabaseConfigured()) {
          try {
            const supabase = createAdminClient();
            const { data: active, error: regionErr } = await supabase
              .from("shipping_regions")
              .select(
                "id, name_ar, name_en, shipping_fee, is_active, estimated_days, estimated_days_min, estimated_days_max, estimated_delivery_ar"
              )
              .eq("is_active", true);
            if (!regionErr) {
              dbRows = (active as RegionMatch[] | null) ?? [];
            }
          } catch {
            dbRows = null;
          }
        }

        const found = matchShippingRegion(regionIdHint, regionText, dbRows);
        if (found) {
          matched = found.match;
          regionMatchSource = found.source;
        }
      }
    }

    const resolved = resolveDeliveryShipping({
      body,
      needsShipping,
      deliveryMethod,
      matched,
      regionMatchSource,
      regionText,
      siteSettings,
    });

    const row = buildShopOrderRow(body, resolved);

    console.info("[orders API] resolved shipping for insert", {
      id: row.id,
      delivery_method: row.delivery_method,
      shipping_cost: row.shipping_cost,
      shipping_fee_pending: row.shipping_fee_pending,
      total: row.total,
      region_id: row.shipping_region_id,
    });

    if (!isSupabaseConfigured()) {
      memoryOrdersStore().unshift(row);
      console.info("[orders API] saved to memory (Supabase not configured)", row.id);
      scheduleNotifications(() => onOrderSubmitted(row));
      return NextResponse.json({ success: true, order: row });
    }

    const supabase = createAdminClient();
    const insertAttempts = buildProgressiveInsertPayloads(row);
    const insertFull = insertAttempts[0];

    let error: { message?: string; code?: string } | null = null;
    let savedPayload: Record<string, unknown> | null = null;
    let clearRegionId = false;

    for (let i = 0; i < insertAttempts.length; i++) {
      let payload = { ...insertAttempts[i] };
      if (clearRegionId && "shipping_region_id" in payload) {
        payload = { ...payload, shipping_region_id: null };
      }
      const result = await supabase.from("shop_orders").insert(payload);
      error = result.error;
      if (!error) {
        savedPayload = payload;
        break;
      }

      // Invalid/stale region id — keep delivery_method + address; clear FK and retry.
      if (!clearRegionId && isShippingRegionFkError(error)) {
        console.warn(
          "[orders API] shipping_region_id FK failed — retrying with null region id",
          getErrorMessage(error)
        );
        clearRegionId = true;
        row.shipping_region_id = null;
        i -= 1; // retry same payload tier with null region id
        continue;
      }

      const canRetry =
        i < insertAttempts.length - 1 && isOrderSchemaError(error);
      if (!canRetry) break;
      console.warn(
        `[orders API] insert attempt ${i + 1}/${insertAttempts.length} failed — retrying without newer columns. Run supabase/APPLY_MISSING_MIGRATIONS.sql`,
        getErrorMessage(error)
      );
    }

    if (error) {
      // Delivery/pickup must not silently save without shipping columns.
      if (
        (row.delivery_method === "delivery" ||
          row.delivery_method === "pickup") &&
        isOrderSchemaError(error)
      ) {
        return NextResponse.json(
          {
            error:
              "تعذّر حفظ بيانات الشحن — نفّذي supabase/APPLY_MISSING_MIGRATIONS.sql في SQL Editor ثم أعيدي المحاولة.",
          },
          { status: 503 }
        );
      }
      const mapped = mapOrderError(error);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }

    // Best-effort: if progressive insert dropped delivery/shipping columns,
    // patch them back so admin never loses delivery_method=delivery.
    if (savedPayload && row.delivery_method) {
      const fullForPatch = {
        ...insertFull,
        shipping_region_id: clearRegionId ? null : insertFull.shipping_region_id,
      };
      const missingKeys = [
        ...Object.keys(fullForPatch).filter((k) => !(k in savedPayload!)),
        // Always re-assert critical delivery keys even if a narrower tier omitted them
        ...DELIVERY_PERSIST_KEYS.filter((k) => !(k in savedPayload!)),
      ].filter((k, idx, arr) => arr.indexOf(k) === idx);

      if (missingKeys.length > 0) {
        const patch: Record<string, unknown> = {};
        for (const k of missingKeys) {
          if (k in fullForPatch) {
            patch[k] = (fullForPatch as Record<string, unknown>)[k];
          } else if (k in row) {
            patch[k] = (row as unknown as Record<string, unknown>)[k];
          }
        }
        const { error: patchError } = await supabase
          .from("shop_orders")
          .update(patch)
          .eq("id", row.id);
        if (patchError && isOrderSchemaError(patchError)) {
          // Strip unknown columns one group at a time
          const m9Keys = [
            "delivery_method",
            "shipping_required",
            "shipping_cost",
            "shipping_region_id",
            "shipping_region_name_ar",
            "shipping_building_number",
            "shipping_neighborhood",
            "shipping_full_name",
            "shipping_phone",
            "shipping_city",
            "shipping_region",
            "shipping_address",
            "shipping_postal_code",
            "shipping_notes",
            "total",
          ];
          const m9Patch: Record<string, unknown> = {};
          for (const k of m9Keys) {
            if (k in patch) m9Patch[k] = patch[k];
          }
          if (Object.keys(m9Patch).length > 0) {
            const retry = await supabase
              .from("shop_orders")
              .update(m9Patch)
              .eq("id", row.id);
            if (retry.error) {
              console.warn(
                "[orders API] could not backfill delivery_method after progressive insert",
                getErrorMessage(retry.error)
              );
            }
          }
        } else if (patchError) {
          console.warn(
            "[orders API] shipping field backfill failed",
            getErrorMessage(patchError)
          );
        }
      }
    }

    // Same-process read-through so confirmation GET works even if anon RLS
    // blocks shop_orders SELECT (no service role / public read policy yet).
    const mem = memoryOrdersStore();
    mem.unshift(row);
    if (mem.length > 100) mem.length = 100;

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

/** Soft-delete / permanent (trash only). No hard delete from active list. */
export async function DELETE(request: Request) {
  const { user, error: authError } = await requireAdminApi();
  if (authError) return authError;

  const { handleModuleDelete } = await import("@/lib/admin/soft-delete-api");
  return handleModuleDelete({
    request,
    module: "orders",
    actor: { id: user!.id, email: user!.email },
    missingIdMessage: "معرّف الطلب مطلوب",
  });
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
      /** Admin shipping edits (pending fee, tracking, notes) */
      shipping_cost?: number;
      shipping_fee_pending?: boolean;
      region_configured?: boolean;
      shipping_region_id?: string | null;
      shipping_region_name_ar?: string | null;
      shipping_region_custom?: string | null;
      tracking_number?: string | null;
      tracking_url?: string | null;
      internal_shipping_notes?: string | null;
      carrier_code?: string | null;
      shipping_notes?: string | null;
    };

    if (!body.id) {
      return NextResponse.json({ error: "معرّف الطلب مطلوب" }, { status: 400 });
    }

    const status = resolveStatusFromBody(body);
    const hasShippingPatch =
      body.shipping_cost !== undefined ||
      body.shipping_fee_pending !== undefined ||
      body.region_configured !== undefined ||
      body.shipping_region_id !== undefined ||
      body.shipping_region_name_ar !== undefined ||
      body.shipping_region_custom !== undefined ||
      body.tracking_number !== undefined ||
      body.tracking_url !== undefined ||
      body.internal_shipping_notes !== undefined ||
      body.carrier_code !== undefined ||
      body.shipping_notes !== undefined;

    if (!status && !hasShippingPatch) {
      return NextResponse.json(
        { error: "حالة الطلب أو الإجراء غير صالح" },
        { status: 400 }
      );
    }

    const paymentAmount =
      typeof body.paymentAmount === "number" && body.paymentAmount > 0
        ? body.paymentAmount
        : undefined;

    const buildShippingUpdate = (existing: ShopOrder) => {
      const patch: Record<string, unknown> = {};
      if (body.tracking_number !== undefined) {
        patch.tracking_number = body.tracking_number?.trim() || null;
      }
      if (body.tracking_url !== undefined) {
        patch.tracking_url = body.tracking_url?.trim() || null;
      }
      if (body.internal_shipping_notes !== undefined) {
        patch.internal_shipping_notes =
          body.internal_shipping_notes?.trim() || null;
      }
      if (body.carrier_code !== undefined) {
        patch.carrier_code = body.carrier_code?.trim() || null;
      }
      if (body.shipping_notes !== undefined) {
        patch.shipping_notes = body.shipping_notes?.trim() || null;
      }
      if (body.shipping_region_id !== undefined) {
        patch.shipping_region_id = body.shipping_region_id;
      }
      if (body.shipping_region_name_ar !== undefined) {
        patch.shipping_region_name_ar = body.shipping_region_name_ar;
      }
      if (body.shipping_region_custom !== undefined) {
        patch.shipping_region_custom = body.shipping_region_custom;
      }
      if (body.region_configured !== undefined) {
        patch.region_configured = body.region_configured;
      }

      if (body.shipping_cost !== undefined || body.shipping_fee_pending !== undefined) {
        const itemsSubtotal = (existing.items ?? []).reduce(
          (sum, i) => sum + Number(i.unit_price) * Number(i.quantity),
          0
        );
        const nextFee =
          body.shipping_cost !== undefined
            ? Math.max(0, Number(body.shipping_cost) || 0)
            : Number(existing.shipping_cost ?? 0);
        const nextPending =
          body.shipping_fee_pending !== undefined
            ? Boolean(body.shipping_fee_pending)
            : body.shipping_cost !== undefined
              ? false
              : Boolean(existing.shipping_fee_pending);
        patch.shipping_cost = nextPending ? 0 : nextFee;
        patch.shipping_fee_pending = nextPending;
        if (!nextPending && body.shipping_cost !== undefined) {
          patch.region_configured = true;
          patch.total = itemsSubtotal + nextFee;
        } else if (nextPending) {
          patch.total = itemsSubtotal;
        }
      }
      return patch;
    };

    if (!isSupabaseConfigured()) {
      const store = memoryOrdersStore();
      const idx = store.findIndex((o) => o.id === body.id);
      if (idx < 0) {
        return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
      }
      const previous = store[idx].status;
      let order = store[idx];
      if (hasShippingPatch) {
        order = { ...order, ...buildShippingUpdate(order) } as ShopOrder;
        store[idx] = order;
      }
      if (status && previous !== status) {
        store[idx] = { ...store[idx], status };
        order = store[idx];
        scheduleNotifications(() =>
          onOrderStatusChanged(order, previous, status, { paymentAmount })
        );
        return NextResponse.json({ success: true, status, order });
      }
      if (status && previous === status && !hasShippingPatch) {
        return NextResponse.json({
          success: true,
          unchanged: true,
          message: "لم تتغير الحالة — لم تُرسل إشعارات",
        });
      }
      return NextResponse.json({ success: true, order: store[idx] });
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
    const updatePayload: Record<string, unknown> = {};
    if (hasShippingPatch) {
      Object.assign(updatePayload, buildShippingUpdate(existing as ShopOrder));
    }
    if (status && previous !== status) {
      updatePayload.status = status;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({
        success: true,
        unchanged: true,
        message: "لم تتغير الحالة — لم تُرسل إشعارات",
      });
    }

    const { data: updated, error } = await supabase
      .from("shop_orders")
      .update(updatePayload)
      .eq("id", body.id)
      .select("*")
      .maybeSingle();
    if (error) {
      const mapped = mapOrderError(error);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }

    const order = (updated as ShopOrder) ?? {
      ...(existing as ShopOrder),
      ...updatePayload,
    };
    if (status && previous !== status) {
      scheduleNotifications(() =>
        onOrderStatusChanged(order, previous, status, { paymentAmount })
      );
      return NextResponse.json({ success: true, status, order });
    }
    return NextResponse.json({ success: true, order });
  } catch (e) {
    const mapped = mapOrderError(e);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
