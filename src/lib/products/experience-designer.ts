/**
 * Product Experience Designer — section layout config (Sprint 2A MASTER).
 * Per-product `experience_config` JSONB + reusable DB templates.
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

export type ProductExperienceConfig = {
  sections: ExperienceSectionConfig[];
  /** Optional link to product_experience_templates.id */
  template_id?: string | null;
};

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
    id: "order_options",
    enabled: true,
    collapsed: false,
    sort_order: 3,
    title: "Order Options",
    title_ar: "خيارات الطلب",
    description: "",
    description_ar: "",
  },
  {
    id: "delivery",
    enabled: true,
    collapsed: true,
    sort_order: 4,
    title: "Delivery",
    title_ar: "التوصيل",
    description: "",
    description_ar: "",
  },
  {
    id: "order_notes",
    enabled: true,
    collapsed: true,
    sort_order: 5,
    title: "Order Notes",
    title_ar: "ملاحظات الطلب",
    description: "",
    description_ar: "",
  },
  {
    id: "summary",
    enabled: true,
    collapsed: false,
    sort_order: 6,
    title: "Summary",
    title_ar: "ملخص السعر",
    description: "",
    description_ar: "",
  },
];

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
  return {
    id,
    enabled: bool(row.enabled, fallback.enabled),
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
  return { sections: ordered, template_id };
}

export function defaultProductExperienceConfig(): ProductExperienceConfig {
  return normalizeProductExperienceConfig({});
}

/** Ordered enabled sections for the modal. */
export function enabledExperienceSections(
  config?: ProductExperienceConfig | null
): ExperienceSectionConfig[] {
  const normalized = normalizeProductExperienceConfig(config ?? {});
  return normalized.sections
    .filter((s) => s.enabled)
    .sort((a, b) => a.sort_order - b.sort_order);
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
