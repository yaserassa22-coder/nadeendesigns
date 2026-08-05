/**
 * Order options + extra services config + line pricing helpers (Sprint 2 / 2A).
 * Stored under settings.key = "store" JSON sections.
 * Selections persist on cart / shop_orders.items JSON (no schema migration).
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

/**
 * Active Sprint 2A pricing modes.
 * Future-ready (types only — not implemented): PERCENTAGE | QUANTITY | CONDITIONAL.
 */
export type ServicePricingMode = "FREE" | "FIXED_PRICE";

/** Reserved for later pricing engines — do not activate in storefront yet. */
export type FutureServicePricingMode =
  | "PERCENTAGE"
  | "QUANTITY"
  | "CONDITIONAL";

export type ExtraServiceConfig = {
  id: ExtraServiceId | string;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  /** FREE → 0; FIXED_PRICE → `price`. Extensible for future modes. */
  pricing_mode: ServicePricingMode;
  /** Unit price when pricing_mode === FIXED_PRICE; ignored when FREE. */
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
    description: "",
    description_ar: "",
    pricing_mode: "FREE",
    price: 0,
    enabled: false,
    sort_order: 0,
  },
  {
    id: "greeting_card",
    name: "Greeting Card",
    name_ar: "بطاقة تهنئة",
    description: "",
    description_ar: "",
    pricing_mode: "FREE",
    price: 0,
    enabled: false,
    sort_order: 1,
  },
  {
    id: "luxury_box",
    name: "Luxury Box",
    name_ar: "علبة فاخرة",
    description: "",
    description_ar: "",
    pricing_mode: "FREE",
    price: 0,
    enabled: false,
    sort_order: 2,
  },
  {
    id: "express_delivery",
    name: "Express Delivery",
    name_ar: "توصيل سريع",
    description: "",
    description_ar: "",
    pricing_mode: "FREE",
    price: 0,
    enabled: false,
    sort_order: 3,
  },
];

/**
 * Idempotent legacy migrate: missing pricing_mode → FREE when price=0, FIXED when price>0.
 * FREE always forces price 0; FIXED_PRICE keeps admin price (≥0).
 */
export function resolveServicePricingMode(
  rawMode: unknown,
  price: number
): ServicePricingMode {
  if (rawMode === "FREE" || rawMode === "FIXED_PRICE") return rawMode;
  return price > 0 ? "FIXED_PRICE" : "FREE";
}

/** Server/client authoritative unit price for a configured service. */
export function effectiveServiceUnitPrice(svc: {
  pricing_mode?: ServicePricingMode | null;
  price?: number | null;
}): number {
  const price =
    typeof svc.price === "number" && Number.isFinite(svc.price)
      ? Math.max(0, svc.price)
      : 0;
  const mode = resolveServicePricingMode(svc.pricing_mode, price);
  if (mode === "FREE") return 0;
  return price;
}

/** Storefront label: مجاني vs +₪40 */
export function formatExtraServicePriceLabel(svc: {
  pricing_mode?: ServicePricingMode | null;
  price?: number | null;
}): string {
  const amount = effectiveServiceUnitPrice(svc);
  if (amount <= 0) return "مجاني";
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(amount);
  return `+₪ ${formatted}`;
}

/** Whether PDP must open the Product Experience Modal before cart/checkout. */
export function productNeedsExperienceModal(input: {
  supportsPersonalization?: boolean;
  orderOptions?: OrderOptionConfig[] | null;
  extraServices?: ExtraServiceConfig[] | null;
}): boolean {
  if (input.supportsPersonalization) return true;
  if ((input.orderOptions?.length ?? 0) > 0) return true;
  if ((input.extraServices?.length ?? 0) > 0) return true;
  return false;
}

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

  const mergeService = (
    def: ExtraServiceConfig,
    row: Record<string, unknown> | undefined
  ): ExtraServiceConfig => {
    if (!row) return { ...def };
    const rawPrice =
      typeof row.price === "number" && Number.isFinite(row.price)
        ? Math.max(0, row.price)
        : def.price;
    const pricing_mode = resolveServicePricingMode(row.pricing_mode, rawPrice);
    const price = pricing_mode === "FREE" ? 0 : rawPrice;
    return {
      ...def,
      name: typeof row.name === "string" ? row.name : def.name,
      name_ar: typeof row.name_ar === "string" ? row.name_ar : def.name_ar,
      description:
        typeof row.description === "string" ? row.description : def.description,
      description_ar:
        typeof row.description_ar === "string"
          ? row.description_ar
          : def.description_ar,
      pricing_mode,
      price,
      enabled: typeof row.enabled === "boolean" ? row.enabled : def.enabled,
      sort_order:
        typeof row.sort_order === "number" ? row.sort_order : def.sort_order,
    };
  };

  const known = DEFAULT_EXTRA_SERVICES.map((def) =>
    mergeService(def, byId.get(def.id))
  );
  // Preserve any custom services admin may add later
  for (const [id, row] of byId) {
    if (known.some((s) => s.id === id)) continue;
    known.push(
      mergeService(
        {
          id,
          name: id,
          name_ar: id,
          description: "",
          description_ar: "",
          pricing_mode: "FREE",
          price: 0,
          enabled: false,
          sort_order: known.length,
        },
        row
      )
    );
  }
  known.sort((a, b) => a.sort_order - b.sort_order);
  return { services: known };
}

/**
 * Resolve effective order options for a product (store defaults + optional override).
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
 * Returns only services available to the customer (enabled / override-selected).
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
      if (
        typeof overridePrice === "number" &&
        Number.isFinite(overridePrice)
      ) {
        const price = Math.max(0, overridePrice);
        const pricing_mode = resolveServicePricingMode(undefined, price);
        return {
          ...s,
          enabled: true,
          pricing_mode,
          price: pricing_mode === "FREE" ? 0 : price,
        };
      }
      return { ...s, enabled: true };
    });
}

/** Enabled order options for storefront forms (inherits store + product override). */
export function enabledOrderOptions(
  storeDefaults: StoreOrderOptionsSettings,
  productOverride?: ProductOrderOptionsConfig | null
): OrderOptionConfig[] {
  return resolveProductOrderOptions(storeDefaults, productOverride).filter(
    (o) => o.enabled
  );
}

/** Customer-selected order option values persisted on cart / order line items. */
export type LineOrderOptionValue = {
  key: OrderOptionKey;
  label: string;
  label_ar: string;
  value: string;
};

/** Customer-selected paid extra service persisted on cart / order line items. */
export type LineExtraService = {
  id: string;
  name: string;
  name_ar: string;
  /** Server-authoritative unit price for this service. */
  price: number;
  /** Snapshot of pricing mode at add-to-cart (display / audit). */
  pricing_mode?: ServicePricingMode;
};

/** Sum of selected extra-service unit prices (per product unit). */
export function sumExtraServicePrices(
  services: LineExtraService[] | null | undefined
): number {
  if (!services?.length) return 0;
  return services.reduce((sum, s) => {
    const p = effectiveServiceUnitPrice(s);
    return sum + p;
  }, 0);
}

/**
 * Charged unit price: base (sale-aware) + personalization fees (if any) + extras.
 * Personalization currently has no fee — keep hook for future admin pricing.
 */
export function chargedUnitPrice(input: {
  baseUnitPrice: number;
  personalizationFee?: number | null;
  extraServices?: LineExtraService[] | null;
}): number {
  const base = Number(input.baseUnitPrice);
  const baseSafe = Number.isFinite(base) && base >= 0 ? base : 0;
  const pers = Number(input.personalizationFee ?? 0);
  const persSafe = Number.isFinite(pers) && pers > 0 ? pers : 0;
  return baseSafe + persSafe + sumExtraServicePrices(input.extraServices);
}

export function lineChargedTotal(input: {
  baseUnitPrice: number;
  quantity: number;
  personalizationFee?: number | null;
  extraServices?: LineExtraService[] | null;
}): number {
  const qty = Math.max(1, Math.floor(Number(input.quantity) || 1));
  return (
    chargedUnitPrice({
      baseUnitPrice: input.baseUnitPrice,
      personalizationFee: input.personalizationFee,
      extraServices: input.extraServices,
    }) * qty
  );
}

/** Cart / checkout items subtotal including extras (client display). */
export function cartExperienceSubtotal(
  items: Array<{
    unit_price: number;
    quantity: number;
    personalization_fee?: number | null;
    extra_services?: LineExtraService[] | null;
  }>
): number {
  return items.reduce(
    (sum, i) =>
      sum +
      lineChargedTotal({
        baseUnitPrice: i.unit_price,
        quantity: i.quantity,
        personalizationFee: i.personalization_fee,
        extraServices: i.extra_services,
      }),
    0
  );
}

/**
 * Build persisted line option rows from form values + enabled config.
 * Drops empty optional values; required emptiness is validated separately.
 */
export function buildLineOrderOptions(
  enabled: OrderOptionConfig[],
  values: Partial<Record<OrderOptionKey, string>>
): LineOrderOptionValue[] {
  const out: LineOrderOptionValue[] = [];
  for (const opt of enabled) {
    const raw = values[opt.key];
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value) continue;
    out.push({
      key: opt.key,
      label: opt.label,
      label_ar: opt.label_ar,
      value,
    });
  }
  return out;
}

/**
 * Map selected service ids → line rows using server/config prices only.
 * Unknown ids are dropped (never trust client prices).
 */
export function buildLineExtraServices(
  available: ExtraServiceConfig[],
  selectedIds: string[]
): LineExtraService[] {
  const byId = new Map(available.map((s) => [s.id, s]));
  const out: LineExtraService[] = [];
  const seen = new Set<string>();
  for (const id of selectedIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const svc = byId.get(id);
    if (!svc) continue;
    const pricing_mode = resolveServicePricingMode(svc.pricing_mode, svc.price);
    const price = effectiveServiceUnitPrice(svc);
    out.push({
      id: svc.id,
      name: svc.name,
      name_ar: svc.name_ar,
      pricing_mode,
      price,
    });
  }
  return out;
}

/** Validate required order options; returns Arabic field errors keyed by option key. */
export function validateOrderOptionValues(
  enabled: OrderOptionConfig[],
  values: Partial<Record<OrderOptionKey, string>>
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const opt of enabled) {
    if (!opt.required) continue;
    const value = (values[opt.key] ?? "").trim();
    if (!value) {
      errors[opt.key] = `${opt.label_ar || opt.label} مطلوب`;
    }
  }
  return errors;
}

/** Display helper: charged amount for one order/cart line (client-safe). */
export function shopLineDisplayTotal(item: {
  unit_price: number;
  quantity: number;
  personalization_fee?: number | null;
  extra_services?: LineExtraService[] | null;
}): number {
  return lineChargedTotal({
    baseUnitPrice: item.unit_price,
    quantity: item.quantity,
    personalizationFee: item.personalization_fee,
    extraServices: item.extra_services,
  });
}

export function shopLineDisplayUnit(item: {
  unit_price: number;
  personalization_fee?: number | null;
  extra_services?: LineExtraService[] | null;
}): number {
  return chargedUnitPrice({
    baseUnitPrice: item.unit_price,
    personalizationFee: item.personalization_fee,
    extraServices: item.extra_services,
  });
}
