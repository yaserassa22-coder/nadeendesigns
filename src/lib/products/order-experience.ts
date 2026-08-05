/**
 * Order options + extra services config (Sprint 2 Phase 1).
 * Stored under settings.key = "store" JSON sections.
 * Checkout wiring is intentionally NOT implemented in Phase 1.
 */

export type OrderOptionKey =
  | "recipient_name"
  | "gift_message"
  | "delivery_address"
  | "delivery_date"
  | "delivery_time"
  | "order_notes";

export type OrderOptionConfig = {
  key: OrderOptionKey;
  label: string;
  label_ar: string;
  enabled: boolean;
  required: boolean;
};

export type ExtraServiceId =
  | "gift_wrap"
  | "greeting_card"
  | "luxury_box"
  | "express_delivery";

export type ExtraServiceConfig = {
  id: ExtraServiceId | string;
  name: string;
  name_ar: string;
  price: number;
  enabled: boolean;
  sort_order: number;
};

export type StoreOrderOptionsSettings = {
  options: OrderOptionConfig[];
};

export type StoreExtraServicesSettings = {
  services: ExtraServiceConfig[];
};

/** Per-product override: null/undefined = inherit store defaults. */
export type ProductOrderOptionsConfig = {
  /** When true, use `options` instead of store defaults for listed keys. */
  use_custom?: boolean;
  options?: Partial<
    Record<OrderOptionKey, { enabled?: boolean; required?: boolean }>
  >;
};

export type ProductExtraServicesConfig = {
  /** When true, only services listed in `enabled_ids` (or full overrides) apply. */
  use_custom?: boolean;
  enabled_ids?: string[];
  /** Optional per-service price override */
  price_overrides?: Record<string, number>;
};

export const ORDER_OPTION_KEYS: OrderOptionKey[] = [
  "recipient_name",
  "gift_message",
  "delivery_address",
  "delivery_date",
  "delivery_time",
  "order_notes",
];

export const DEFAULT_ORDER_OPTIONS: OrderOptionConfig[] = [
  {
    key: "recipient_name",
    label: "Recipient Name",
    label_ar: "اسم المستلم",
    enabled: false,
    required: false,
  },
  {
    key: "gift_message",
    label: "Gift Message",
    label_ar: "رسالة هدية",
    enabled: false,
    required: false,
  },
  {
    key: "delivery_address",
    label: "Delivery Address",
    label_ar: "عنوان التوصيل",
    enabled: true,
    required: false,
  },
  {
    key: "delivery_date",
    label: "Delivery Date",
    label_ar: "تاريخ التوصيل",
    enabled: false,
    required: false,
  },
  {
    key: "delivery_time",
    label: "Delivery Time",
    label_ar: "وقت التوصيل",
    enabled: false,
    required: false,
  },
  {
    key: "order_notes",
    label: "Order Notes",
    label_ar: "ملاحظات الطلب",
    enabled: true,
    required: false,
  },
];

export const DEFAULT_EXTRA_SERVICES: ExtraServiceConfig[] = [
  {
    id: "gift_wrap",
    name: "Gift Wrap",
    name_ar: "تغليف هدية",
    price: 0,
    enabled: false,
    sort_order: 0,
  },
  {
    id: "greeting_card",
    name: "Greeting Card",
    name_ar: "بطاقة تهنئة",
    price: 0,
    enabled: false,
    sort_order: 1,
  },
  {
    id: "luxury_box",
    name: "Luxury Box",
    name_ar: "علبة فاخرة",
    price: 0,
    enabled: false,
    sort_order: 2,
  },
  {
    id: "express_delivery",
    name: "Express Delivery",
    name_ar: "توصيل سريع",
    price: 0,
    enabled: false,
    sort_order: 3,
  },
];

export function normalizeOrderOptions(raw: unknown): StoreOrderOptionsSettings {
  const src =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : {};
  const list = Array.isArray(src.options) ? src.options : [];
  const byKey = new Map<string, Record<string, unknown>>();
  for (const item of list) {
    if (item && typeof item === "object" && "key" in item) {
      const row = item as Record<string, unknown>;
      if (typeof row.key === "string") byKey.set(row.key, row);
    }
  }
  const options = DEFAULT_ORDER_OPTIONS.map((def) => {
    const row = byKey.get(def.key);
    if (!row) return { ...def };
    return {
      ...def,
      label: typeof row.label === "string" ? row.label : def.label,
      label_ar: typeof row.label_ar === "string" ? row.label_ar : def.label_ar,
      enabled: typeof row.enabled === "boolean" ? row.enabled : def.enabled,
      required: typeof row.required === "boolean" ? row.required : def.required,
    };
  });
  return { options };
}

export function normalizeExtraServices(
  raw: unknown
): StoreExtraServicesSettings {
  const src =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : {};
  const list = Array.isArray(src.services) ? src.services : [];
  const byId = new Map<string, Record<string, unknown>>();
  for (const item of list) {
    if (item && typeof item === "object" && "id" in item) {
      const row = item as Record<string, unknown>;
      if (typeof row.id === "string") byId.set(row.id, row);
    }
  }
  const known = DEFAULT_EXTRA_SERVICES.map((def) => {
    const row = byId.get(def.id);
    if (!row) return { ...def };
    const price =
      typeof row.price === "number" && Number.isFinite(row.price)
        ? Math.max(0, row.price)
        : def.price;
    return {
      ...def,
      name: typeof row.name === "string" ? row.name : def.name,
      name_ar: typeof row.name_ar === "string" ? row.name_ar : def.name_ar,
      price,
      enabled: typeof row.enabled === "boolean" ? row.enabled : def.enabled,
      sort_order:
        typeof row.sort_order === "number"
          ? row.sort_order
          : def.sort_order,
    };
  });
  // Preserve any custom services admin may add later
  for (const [id, row] of byId) {
    if (known.some((s) => s.id === id)) continue;
    known.push({
      id,
      name: typeof row.name === "string" ? row.name : id,
      name_ar: typeof row.name_ar === "string" ? row.name_ar : id,
      price:
        typeof row.price === "number" && Number.isFinite(row.price)
          ? Math.max(0, row.price)
          : 0,
      enabled: typeof row.enabled === "boolean" ? row.enabled : false,
      sort_order:
        typeof row.sort_order === "number" ? row.sort_order : known.length,
    });
  }
  known.sort((a, b) => a.sort_order - b.sort_order);
  return { services: known };
}

/**
 * Resolve effective order options for a product (store defaults + optional override).
 * Phase 1: config resolution only — not wired into checkout UI.
 */
export function resolveProductOrderOptions(
  storeDefaults: StoreOrderOptionsSettings,
  productOverride?: ProductOrderOptionsConfig | null
): OrderOptionConfig[] {
  const base = normalizeOrderOptions(storeDefaults).options;
  if (!productOverride?.use_custom || !productOverride.options) return base;
  return base.map((opt) => {
    const o = productOverride.options?.[opt.key];
    if (!o) return opt;
    return {
      ...opt,
      enabled: typeof o.enabled === "boolean" ? o.enabled : opt.enabled,
      required: typeof o.required === "boolean" ? o.required : opt.required,
    };
  });
}

/**
 * Resolve effective extra services for a product.
 * Phase 1: config resolution only — not wired into checkout UI.
 */
export function resolveProductExtraServices(
  storeDefaults: StoreExtraServicesSettings,
  productOverride?: ProductExtraServicesConfig | null
): ExtraServiceConfig[] {
  const base = normalizeExtraServices(storeDefaults).services;
  if (!productOverride?.use_custom) {
    return base.filter((s) => s.enabled);
  }
  const ids = new Set(productOverride.enabled_ids ?? []);
  return base
    .filter((s) => ids.has(s.id))
    .map((s) => {
      const overridePrice = productOverride.price_overrides?.[s.id];
      return {
        ...s,
        enabled: true,
        price:
          typeof overridePrice === "number" && Number.isFinite(overridePrice)
            ? Math.max(0, overridePrice)
            : s.price,
      };
    });
}
