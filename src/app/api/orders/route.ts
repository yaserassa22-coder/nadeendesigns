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
import {
  cartNeedsShipping,
  findRegionByName,
  resolveShippingCost,
} from "@/lib/shop/shipping";
import {
  isOrderSchemaError,
  selectShopOrdersList,
} from "@/lib/shop/order-query";
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
    // Derive from line items only — never trust client shipping_required:false
    const needsShipping = cartNeedsShipping(body.items);
    const siteSettings = await loadSiteSettingsForShipping();

    let deliveryMethod: DeliveryMethod | null = null;
    let regionFee: number | null = null;
    let regionNameAr: string | null = null;
    let regionId: string | null = null;
    let regionCustom: string | null = null;
    let feePending = false;
    let regionConfigured = true;

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
          ship.full_name.trim().length < 2 ||
          ship.phone.trim().length < 9 ||
          ship.city.trim().length < 2 ||
          ship.address.trim().length < 5
        ) {
          return NextResponse.json(
            {
              error:
                "بيانات التوصيل مطلوبة (الاسم، الهاتف، المدينة، والعنوان).",
            },
            { status: 400 }
          );
        }
        const regionText = ship.region?.trim() || "";
        regionId = ship.shipping_region_id?.trim() || null;
        if (!regionId && regionText.length < 2) {
          return NextResponse.json(
            { error: "المنطقة / المدينة مطلوبة للتوصيل." },
            { status: 400 }
          );
        }

        type RegionRow = {
          id: string;
          name_ar: string;
          name_en?: string | null;
          shipping_fee: number;
          is_active: boolean;
          estimated_days?: number | null;
          estimated_days_min?: number | null;
          estimated_days_max?: number | null;
          estimated_delivery_ar?: string | null;
        };

        let matched: RegionRow | null = null;

        if (isSupabaseConfigured()) {
          try {
            const supabase = createAdminClient();
            if (regionId) {
              const { data: region } = await supabase
                .from("shipping_regions")
                .select(
                  "id, name_ar, name_en, shipping_fee, is_active, estimated_days, estimated_days_min, estimated_days_max, estimated_delivery_ar"
                )
                .eq("id", regionId)
                .maybeSingle();
              if (region && region.is_active !== false) {
                matched = region as RegionRow;
              }
            }
            if (!matched && regionText) {
              const { data: active } = await supabase
                .from("shipping_regions")
                .select(
                  "id, name_ar, name_en, shipping_fee, is_active, estimated_days, estimated_days_min, estimated_days_max, estimated_delivery_ar"
                )
                .eq("is_active", true);
              matched = findRegionByName(
                (active as RegionRow[] | null) ?? [],
                regionText
              );
            }
          } catch {
            matched = null;
          }
        } else if (regionText) {
          // Dev memory mode — match against seed names only
          const seed: RegionRow[] = [
            { id: "b1000000-0000-4000-8000-000000000001", name_ar: "الرياض", name_en: "Riyadh", shipping_fee: 35, is_active: true },
            { id: "b1000000-0000-4000-8000-000000000002", name_ar: "جدة", name_en: "Jeddah", shipping_fee: 40, is_active: true },
            { id: "b1000000-0000-4000-8000-000000000003", name_ar: "الدمام", name_en: "Dammam", shipping_fee: 45, is_active: true },
            { id: "b1000000-0000-4000-8000-000000000004", name_ar: "مكة", name_en: "Makkah", shipping_fee: 40, is_active: true },
            { id: "b1000000-0000-4000-8000-000000000005", name_ar: "المدينة", name_en: "Madinah", shipping_fee: 45, is_active: true },
            { id: "b1000000-0000-4000-8000-000000000006", name_ar: "القصيم", name_en: "Qassim", shipping_fee: 50, is_active: true },
            { id: "b1000000-0000-4000-8000-000000000007", name_ar: "تبوك", name_en: "Tabuk", shipping_fee: 55, is_active: true },
            { id: "b1000000-0000-4000-8000-000000000008", name_ar: "أبها", name_en: "Abha", shipping_fee: 55, is_active: true },
            { id: "b1000000-0000-4000-8000-000000000009", name_ar: "حائل", name_en: "Hail", shipping_fee: 55, is_active: true },
            { id: "b1000000-0000-4000-8000-000000000010", name_ar: "الطائف", name_en: "Taif", shipping_fee: 45, is_active: true },
            { id: "b1000000-0000-4000-8000-000000000011", name_ar: "أخرى", name_en: "Other", shipping_fee: 60, is_active: true },
          ];
          matched =
            (regionId ? seed.find((r) => r.id === regionId) : null) ??
            findRegionByName(seed, regionText);
        }

        if (matched) {
          regionId = matched.id;
          regionNameAr = matched.name_ar;
          regionFee = Number(matched.shipping_fee) || 0;
          regionConfigured = true;
          feePending = false;
          regionCustom = null;
        } else {
          // Unknown / custom region — do not block checkout
          regionId = null;
          regionNameAr = regionText || ship.region?.trim() || null;
          regionCustom = regionNameAr;
          regionFee = null;
          regionConfigured = false;
          feePending = true;
        }
      }
    }

    const shipping =
      needsShipping && deliveryMethod === "delivery" ? body.shipping : null;
    const itemsSubtotal = body.items.reduce(
      (sum, i) => sum + Number(i.unit_price) * Number(i.quantity),
      0
    );
    const shippingCost = feePending
      ? 0
      : resolveShippingCost(needsShipping, itemsSubtotal, siteSettings, {
          deliveryMethod,
          regionFee,
        });
    const computedTotal = itemsSubtotal + shippingCost;

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
      total: computedTotal,
      status: "pending",
      created_at,
      shipping_required: needsShipping,
      delivery_method: needsShipping ? deliveryMethod : null,
      shipping_full_name: shipping?.full_name?.trim() || null,
      shipping_phone: shipping?.phone?.trim() || null,
      shipping_city: shipping?.city?.trim() || null,
      shipping_region:
        shipping?.region?.trim() || regionNameAr || null,
      shipping_region_id: regionId,
      shipping_region_name_ar: regionNameAr,
      shipping_region_custom: regionCustom,
      region_configured: needsShipping && deliveryMethod === "delivery"
        ? regionConfigured
        : true,
      shipping_fee_pending: feePending,
      shipping_address: shipping?.address?.trim() || null,
      shipping_building_number: shipping?.building_number?.trim() || null,
      shipping_neighborhood: shipping?.neighborhood?.trim() || null,
      shipping_postal_code: shipping?.postal_code?.trim() || null,
      shipping_notes: shipping?.notes?.trim() || null,
      shipping_cost: shippingCost,
      tracking_number: null,
      tracking_url: null,
      internal_shipping_notes: null,
      carrier_code: null,
      notify_whatsapp: body.notify_whatsapp ?? true,
      notify_email: body.notify_email ?? true,
    };

    if (!isSupabaseConfigured()) {
      memoryOrdersStore().unshift(row);
      console.info("[orders API] saved to memory (Supabase not configured)", row.id);
      scheduleNotifications(() => onOrderSubmitted(row));
      return NextResponse.json({ success: true, order: row });
    }

    const supabase = createAdminClient();
    const core = {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      notes: row.notes,
      items: row.items,
      gift_options: row.gift_options,
      total: row.total,
      status: row.status,
    };
    const withShippingLegacy = {
      ...core,
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
    const withShippingM9 = {
      ...withShippingLegacy,
      delivery_method: row.delivery_method,
      shipping_region_id: row.shipping_region_id,
      shipping_region_name_ar: row.shipping_region_name_ar,
      shipping_building_number: row.shipping_building_number,
      shipping_neighborhood: row.shipping_neighborhood,
    };
    const insertFull = {
      ...withShippingM9,
      shipping_region_custom: row.shipping_region_custom,
      region_configured: row.region_configured,
      shipping_fee_pending: row.shipping_fee_pending,
      tracking_number: row.tracking_number,
      tracking_url: row.tracking_url,
      internal_shipping_notes: row.internal_shipping_notes,
      carrier_code: row.carrier_code,
      notify_whatsapp: row.notify_whatsapp ?? true,
      notify_email: row.notify_email ?? true,
    };

    // Progressive insert: never lose an order when optional shipping columns are absent.
    const insertAttempts = [
      insertFull,
      {
        ...withShippingM9,
        notify_whatsapp: row.notify_whatsapp ?? true,
        notify_email: row.notify_email ?? true,
      },
      withShippingM9,
      {
        ...withShippingLegacy,
        notify_whatsapp: row.notify_whatsapp ?? true,
        notify_email: row.notify_email ?? true,
      },
      withShippingLegacy,
      {
        ...core,
        notify_whatsapp: row.notify_whatsapp ?? true,
        notify_email: row.notify_email ?? true,
      },
      core,
    ];

    let error: { message?: string; code?: string } | null = null;
    for (let i = 0; i < insertAttempts.length; i++) {
      const payload = insertAttempts[i];
      const result = await supabase.from("shop_orders").insert(payload);
      error = result.error;
      if (!error) break;
      const canRetry =
        i < insertAttempts.length - 1 && isOrderSchemaError(error);
      if (!canRetry) break;
      console.warn(
        `[orders API] insert attempt ${i + 1}/${insertAttempts.length} failed — retrying without newer columns. Run APPLY_SMART_SHIPPING.sql / APPLY_SHIPPING_REGIONS.sql / APPLY_SHOP_SHIPPING.sql`,
        getErrorMessage(error)
      );
    }

    if (error) {
      const mapped = mapOrderError(error);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
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
