export type CategoryProductKind =
  | "dress"
  | "veil"
  | "bridal_robe"
  | "accessories_group";

export interface Category {
  id: string;
  name_ar: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  is_visible: boolean;
  icon_url: string | null;
  cover_image_url: string | null;
  description_ar: string;
  /** Public path for dedicated static routes (optional) */
  href: string | null;
  /** Maps to historical TEXT category values during migration */
  legacy_key: string | null;
  /** Product surface this category belongs to (migration 027) */
  product_kind: CategoryProductKind | null;
  seo_title_ar: string | null;
  seo_description_ar: string | null;
  seo_og_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export type CategoryTreeNode = Category & {
  children: CategoryTreeNode[];
};

/** Fixed seed IDs so parent/child links work offline */
const IDS = {
  wedding: "a1000000-0000-4000-8000-000000000001",
  rental: "a1000000-0000-4000-8000-000000000002",
  custom: "a1000000-0000-4000-8000-000000000003",
  nouf: "a1000000-0000-4000-8000-000000000004",
  accessories: "a1000000-0000-4000-8000-000000000005",
  veils: "a1000000-0000-4000-8000-000000000006",
  robes: "a1000000-0000-4000-8000-000000000007",
} as const;

const now = "2026-01-01T00:00:00.000Z";

/** Offline / missing-table fallback only — not a product UX source of truth */
export const SEED_CATEGORIES: Category[] = [
  {
    id: IDS.wedding,
    name_ar: "فساتين الزفاف",
    slug: "wedding-dresses",
    parent_id: null,
    sort_order: 10,
    is_visible: true,
    icon_url: null,
    cover_image_url: null,
    description_ar: "",
    href: "/wedding-dresses",
    legacy_key: "wedding",
    product_kind: "dress",
    seo_title_ar: null,
    seo_description_ar: null,
    seo_og_image_url: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: IDS.rental,
    name_ar: "فساتين للإيجار",
    slug: "rental-dresses",
    parent_id: null,
    sort_order: 20,
    is_visible: true,
    icon_url: null,
    cover_image_url: null,
    description_ar: "",
    href: "/rental-dresses",
    legacy_key: "rental",
    product_kind: "dress",
    seo_title_ar: null,
    seo_description_ar: null,
    seo_og_image_url: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: IDS.custom,
    name_ar: "تصميم فستان خاص",
    slug: "custom-design",
    parent_id: null,
    sort_order: 30,
    is_visible: true,
    icon_url: null,
    cover_image_url: null,
    description_ar: "",
    href: "/custom-design",
    legacy_key: "custom_design",
    product_kind: "dress",
    seo_title_ar: null,
    seo_description_ar: null,
    seo_og_image_url: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: IDS.nouf,
    name_ar: "فساتين نوف",
    slug: "nouf-dresses",
    parent_id: null,
    sort_order: 40,
    is_visible: true,
    icon_url: null,
    cover_image_url: null,
    description_ar: "",
    href: "/nouf-dresses",
    legacy_key: "nouf_dresses",
    product_kind: "dress",
    seo_title_ar: null,
    seo_description_ar: null,
    seo_og_image_url: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: IDS.accessories,
    name_ar: "اكسسوارات العروس",
    slug: "bridal-accessories",
    parent_id: null,
    sort_order: 50,
    is_visible: true,
    icon_url: null,
    cover_image_url: null,
    description_ar: "طرحة العروس وبرنص العروس",
    href: null,
    legacy_key: "bridal_accessories",
    product_kind: "accessories_group",
    seo_title_ar: null,
    seo_description_ar: null,
    seo_og_image_url: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: IDS.veils,
    name_ar: "طرحة العروس",
    slug: "veils",
    parent_id: IDS.accessories,
    sort_order: 10,
    is_visible: true,
    icon_url: null,
    cover_image_url: null,
    description_ar: "",
    href: "/veils",
    legacy_key: "veils",
    product_kind: "veil",
    seo_title_ar: null,
    seo_description_ar: null,
    seo_og_image_url: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: IDS.robes,
    name_ar: "برنص العروس",
    slug: "robes",
    parent_id: IDS.accessories,
    sort_order: 20,
    is_visible: true,
    icon_url: null,
    cover_image_url: null,
    description_ar: "",
    href: "/robes",
    legacy_key: "bridal_robes",
    product_kind: "bridal_robe",
    seo_title_ar: null,
    seo_description_ar: null,
    seo_og_image_url: null,
    created_at: now,
    updated_at: now,
  },
];

export function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  const map = new Map<string, CategoryTreeNode>();
  for (const c of categories) {
    map.set(c.id, { ...c, children: [] });
  }
  const roots: CategoryTreeNode[] = [];
  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortNodes = (nodes: CategoryTreeNode[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order || a.name_ar.localeCompare(b.name_ar, "ar"));
    for (const n of nodes) sortNodes(n.children);
  };
  sortNodes(roots);
  return roots;
}

/** Latin-friendly slug; Arabic letters kept for flexibility */
export function slugifyCategory(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u0600-\u06FF-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Normalize optional product_kind from DB (missing column → infer from legacy_key). */
export function resolveCategoryProductKind(
  category: Pick<Category, "product_kind" | "legacy_key">
): CategoryProductKind | null {
  if (category.product_kind) return category.product_kind;
  const key = category.legacy_key;
  if (!key) return null;
  if (
    key === "wedding" ||
    key === "rental" ||
    key === "custom_design" ||
    key === "nouf_dresses"
  ) {
    return "dress";
  }
  if (key === "veils" || key === "veil") return "veil";
  if (key === "bridal_robes" || key === "bridal_cape") return "bridal_robe";
  if (key === "bridal_accessories") return "accessories_group";
  return null;
}

export function isAccessoriesGroupCategory(
  category: Pick<Category, "product_kind" | "legacy_key">
): boolean {
  return resolveCategoryProductKind(category) === "accessories_group";
}

export function isDressProductCategory(
  category: Pick<Category, "product_kind" | "legacy_key">
): boolean {
  const kind = resolveCategoryProductKind(category);
  // New admin categories without kind default to dress for product assignment
  return kind === "dress" || kind === null;
}

/**
 * Admin product selectors: dress-kind rows including null/empty product_kind.
 * Does NOT filter is_visible — admins must assign products to hidden categories too.
 */
export function selectDressAssignableCategories(
  categories: readonly Category[]
): Category[] {
  return categories.filter((c) => isDressProductCategory(c));
}
