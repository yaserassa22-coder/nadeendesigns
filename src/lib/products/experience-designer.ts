/**
 * Product Experience Designer — section layout config (Sprint 2A MASTER).
 * Per-product `experience_config` JSONB + reusable DB templates.
 *
 * Storefront PDP / Experience Modal render ONLY purchase-config sections.
 * Delivery / address / notes / order options are checkout-only and never
 * appear on the product page (kept in Admin for future use).
 */

export type ExperienceSectionId =
  | "personalization"
  | "extra_services"
  | "gift_options"
  | "delivery"
  | "order_notes"
  | "order_options"
  | "summary";

export type ExperienceSectionConfig = {
  id: ExperienceSectionId;
  enabled: boolean;
  /** Start collapsed in the modal (customer can expand). */
  collapsed: boolean;
  sort_order: number;
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
};

/** Admin UI settings for the Personalization card (stored in experience_config JSON). */
export type ExperiencePersonalizationUi = {
  required: boolean;
  max_characters: number;
  /** Charged when personalization is enabled on a cart line (server + client). */
  extra_price: number;
};

export type ProductExperienceConfig = {
  sections: ExperienceSectionConfig[];
  /** Optional link to product_experience_templates.id */
  template_id?: string | null;
  /** Luxury admin v2 personalization card fields */
  personalization_ui?: ExperiencePersonalizationUi;
};

export const DEFAULT_PERSONALIZATION_UI: ExperiencePersonalizationUi = {
  required: false,
  max_characters: 40,
  extra_price: 0,
};

/** Friendly Arabic labels for store-owner UI (never show raw ids). */
export const EXPERIENCE_SECTION_LABELS_AR: Record<ExperienceSectionId, string> =
  {
    personalization: "التخصيص",
    extra_services: "خدمات إضافية",
    gift_options: "تغليف هدية",
    summary: "الملخص",
    delivery: "التوصيل",
    order_notes: "ملاحظات الطلب",
    order_options: "خيارات الطلب",
  };

/** Primary customer-journey steps shown in the visual builder. */
export const JOURNEY_SECTION_IDS: ExperienceSectionId[] = [
  "personalization",
  "extra_services",
  "gift_options",
  "summary",
];

export type ExperienceTemplateRow = {
  id: string;
  slug: string | null;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  config: ProductExperienceConfig;
  is_system: boolean;
  sort_order: number;
};

export const EXPERIENCE_SECTION_IDS: ExperienceSectionId[] = [
  "personalization",
  "extra_services",
  "gift_options",
  "delivery",
  "order_notes",
  "order_options",
  "summary",
];

/**
 * Sections allowed on Product Page / Experience Modal.
 * Quantity + purchase buttons are always present (not designer sections).
 */
export const STOREFRONT_EXPERIENCE_SECTION_IDS: ExperienceSectionId[] = [
  "personalization",
  "extra_services",
  "gift_options",
  "summary",
];

/**
 * Checkout-only — never render on PDP / Experience Modal.
 * Kept in Admin designer for future checkout wiring.
 */
export const CHECKOUT_ONLY_SECTION_IDS: ExperienceSectionId[] = [
  "order_options",
  "delivery",
  "order_notes",
];

export function isCheckoutOnlyExperienceSection(
  id: ExperienceSectionId
): boolean {
  return CHECKOUT_ONLY_SECTION_IDS.includes(id);
}

export function isStorefrontExperienceSection(
  id: ExperienceSectionId
): boolean {
  return STOREFRONT_EXPERIENCE_SECTION_IDS.includes(id);
}

/** Delivery-related order option keys (split from generic order_options). */
export const DELIVERY_OPTION_KEYS = [
  "delivery_address",
  "delivery_date",
  "delivery_time",
] as const;

export const DEFAULT_EXPERIENCE_SECTIONS: ExperienceSectionConfig[] = [
  {
    id: "personalization",
    enabled: true,
    collapsed: false,
    sort_order: 0,
    title: "Personalization",
    title_ar: "تخصيص الكتابة",
    description: "",
    description_ar: "",
  },
  {
    id: "extra_services",
    enabled: true,
    collapsed: false,
    sort_order: 1,
    title: "Extra Services",
    title_ar: "خدمات إضافية",
    description: "",
    description_ar: "",
  },
  {
    id: "gift_options",
    enabled: true,
    collapsed: false,
    sort_order: 2,
    title: "Gift Options",
    title_ar: "تغليف هدية",
    description: "",
    description_ar: "",
  },
  {
    id: "summary",
    enabled: true,
    collapsed: false,
    sort_order: 3,
    title: "Summary",
    title_ar: "ملخص السعر",
    description: "",
    description_ar: "",
  },
  // Checkout-only — disabled by default; never rendered on PDP/modal.
  {
    id: "order_options",
    enabled: false,
    collapsed: true,
    sort_order: 4,
    title: "Order Options",
    title_ar: "خيارات الطلب",
    description: "Checkout only — not shown on product page",
    description_ar: "عند الدفع فقط — لا يظهر في صفحة المنتج",
  },
  {
    id: "delivery",
    enabled: false,
    collapsed: true,
    sort_order: 5,
    title: "Delivery",
    title_ar: "التوصيل",
    description: "Checkout only — not shown on product page",
    description_ar: "عند الدفع فقط — لا يظهر في صفحة المنتج",
  },
  {
    id: "order_notes",
    enabled: false,
    collapsed: true,
    sort_order: 6,
    title: "Order Notes",
    title_ar: "ملاحظات الطلب",
    description: "Checkout only — not shown on product page",
    description_ar: "عند الدفع فقط — لا يظهر في صفحة المنتج",
  },
];

/** Canonical storefront template section lists (no checkout fields). */
export const STOREFRONT_TEMPLATE_SECTIONS = {
  gift: [
    {
      id: "extra_services",
      enabled: true,
      collapsed: false,
      sort_order: 0,
      title_ar: "خدمات إضافية",
      title: "Extra Services",
    },
    {
      id: "gift_options",
      enabled: true,
      collapsed: false,
      sort_order: 1,
      title_ar: "تغليف هدية",
      title: "Gift Options",
    },
    {
      id: "personalization",
      enabled: false,
      collapsed: true,
      sort_order: 2,
      title_ar: "تخصيص الكتابة",
      title: "Personalization",
    },
    {
      id: "summary",
      enabled: true,
      collapsed: false,
      sort_order: 3,
      title_ar: "ملخص السعر",
      title: "Summary",
    },
  ],
  accessory: [
    {
      id: "personalization",
      enabled: true,
      collapsed: false,
      sort_order: 0,
      title_ar: "تخصيص الكتابة",
      title: "Personalization",
    },
    {
      id: "gift_options",
      enabled: true,
      collapsed: true,
      sort_order: 1,
      title_ar: "تغليف هدية",
      title: "Gift Options",
    },
    {
      id: "extra_services",
      enabled: true,
      collapsed: false,
      sort_order: 2,
      title_ar: "خدمات إضافية",
      title: "Extra Services",
    },
    {
      id: "summary",
      enabled: true,
      collapsed: false,
      sort_order: 3,
      title_ar: "ملخص السعر",
      title: "Summary",
    },
  ],
  ready_to_buy: [
    {
      id: "extra_services",
      enabled: true,
      collapsed: false,
      sort_order: 0,
      title_ar: "خدمات إضافية",
      title: "Extra Services",
    },
    {
      id: "gift_options",
      enabled: false,
      collapsed: true,
      sort_order: 1,
      title_ar: "تغليف هدية",
      title: "Gift Options",
    },
    {
      id: "personalization",
      enabled: false,
      collapsed: true,
      sort_order: 2,
      title_ar: "تخصيص الكتابة",
      title: "Personalization",
    },
    {
      id: "summary",
      enabled: true,
      collapsed: false,
      sort_order: 3,
      title_ar: "ملخص السعر",
      title: "Summary",
    },
  ],
} as const;

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function num(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeExperienceSection(
  raw: unknown,
  fallback: ExperienceSectionConfig
): ExperienceSectionConfig {
  const row = asObject(raw);
  const id =
    typeof row.id === "string" &&
    EXPERIENCE_SECTION_IDS.includes(row.id as ExperienceSectionId)
      ? (row.id as ExperienceSectionId)
      : fallback.id;

  // Checkout-only sections stay in config for Admin, but never force-enabled
  // for storefront when missing from legacy saves — default disabled.
  const defaultEnabled = isCheckoutOnlyExperienceSection(id)
    ? false
    : fallback.enabled;

  return {
    id,
    enabled: bool(row.enabled, defaultEnabled),
    collapsed: bool(row.collapsed, fallback.collapsed),
    sort_order: Math.floor(num(row.sort_order, fallback.sort_order)),
    title: str(row.title, fallback.title),
    title_ar: str(row.title_ar, fallback.title_ar),
    description: str(row.description, fallback.description),
    description_ar: str(row.description_ar, fallback.description_ar),
  };
}

/** Idempotent normalize — preserves admin order; fills missing sections. */
export function normalizeProductExperienceConfig(
  raw: unknown
): ProductExperienceConfig {
  const src = asObject(raw);
  const list = Array.isArray(src.sections) ? src.sections : [];
  const byId = new Map<ExperienceSectionId, ExperienceSectionConfig>();
  for (const def of DEFAULT_EXPERIENCE_SECTIONS) {
    byId.set(def.id, { ...def });
  }

  const ordered: ExperienceSectionConfig[] = [];
  const seen = new Set<ExperienceSectionId>();

  // Keep the order the admin saved (raw array order wins over default sort_order).
  for (const item of list) {
    const row = asObject(item);
    const id = row.id;
    if (
      typeof id !== "string" ||
      !EXPERIENCE_SECTION_IDS.includes(id as ExperienceSectionId)
    ) {
      continue;
    }
    const sectionId = id as ExperienceSectionId;
    if (seen.has(sectionId)) continue;
    const def = byId.get(sectionId)!;
    ordered.push(normalizeExperienceSection(item, def));
    seen.add(sectionId);
  }

  // Append any sections not present in the saved config.
  for (const def of DEFAULT_EXPERIENCE_SECTIONS) {
    if (seen.has(def.id)) continue;
    ordered.push({ ...def });
  }

  ordered.forEach((s, i) => {
    s.sort_order = i;
  });

  const template_id =
    src.template_id === null
      ? null
      : typeof src.template_id === "string"
        ? src.template_id
        : null;

  const persRaw = asObject(src.personalization_ui);
  const personalization_ui: ExperiencePersonalizationUi = {
    required: bool(persRaw.required, DEFAULT_PERSONALIZATION_UI.required),
    max_characters: Math.max(
      1,
      Math.floor(
        num(persRaw.max_characters, DEFAULT_PERSONALIZATION_UI.max_characters)
      )
    ),
    extra_price: Math.max(
      0,
      num(persRaw.extra_price, DEFAULT_PERSONALIZATION_UI.extra_price)
    ),
  };

  return { sections: ordered, template_id, personalization_ui };
}

export function defaultProductExperienceConfig(): ProductExperienceConfig {
  return normalizeProductExperienceConfig({});
}

/**
 * Ordered enabled sections for Admin (includes checkout-only when enabled).
 */
export function enabledExperienceSections(
  config?: ProductExperienceConfig | null
): ExperienceSectionConfig[] {
  const normalized = normalizeProductExperienceConfig(config ?? {});
  return normalized.sections
    .filter((s) => s.enabled)
    .sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Storefront PDP / Experience Modal sections only.
 * Checkout-only ids are stripped even if a legacy template left them enabled.
 */
export function storefrontExperienceSections(
  config?: ProductExperienceConfig | null
): ExperienceSectionConfig[] {
  return enabledExperienceSections(config).filter((s) =>
    isStorefrontExperienceSection(s.id)
  );
}

export function moveExperienceSection(
  sections: ExperienceSectionConfig[],
  id: ExperienceSectionId,
  direction: "up" | "down"
): ExperienceSectionConfig[] {
  const sorted = [...sections].sort((a, b) => a.sort_order - b.sort_order);
  const idx = sorted.findIndex((s) => s.id === id);
  if (idx < 0) return sorted;
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= sorted.length) return sorted;
  const next = [...sorted];
  [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
  return next.map((s, i) => ({ ...s, sort_order: i }));
}

/**
 * Move a journey section before another (or to end) while keeping
 * checkout-only sections after storefront ones.
 */
export function reorderJourneySection(
  sections: ExperienceSectionConfig[],
  draggedId: ExperienceSectionId,
  targetId: ExperienceSectionId
): ExperienceSectionConfig[] {
  if (draggedId === targetId) return sections;
  if (
    !JOURNEY_SECTION_IDS.includes(draggedId) ||
    !JOURNEY_SECTION_IDS.includes(targetId)
  ) {
    return sections;
  }

  const sorted = [...sections].sort((a, b) => a.sort_order - b.sort_order);
  const journey = sorted.filter((s) => JOURNEY_SECTION_IDS.includes(s.id));
  const rest = sorted.filter((s) => !JOURNEY_SECTION_IDS.includes(s.id));

  const from = journey.findIndex((s) => s.id === draggedId);
  const to = journey.findIndex((s) => s.id === targetId);
  if (from < 0 || to < 0) return sorted;

  const nextJourney = [...journey];
  const [item] = nextJourney.splice(from, 1);
  nextJourney.splice(to, 0, item);

  return [...nextJourney, ...rest].map((s, i) => ({ ...s, sort_order: i }));
}
