export type CategoryProductKind =
  | "dress"
  | "veil"
  | "bridal_robe"
  | "accessories_group";

export interface Category {
  id: string;
  name_ar: string;
  name_en?: string | null;
  name_he?: string | null;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  /** Published on the storefront (existing column — preferred over a duplicate is_published). */
  is_visible: boolean;
  /** Show in header / mobile nav (migration 033). */
  visible_in_navigation: boolean;
  /** Show in homepage collections section (migration 033). */
  show_on_homepage: boolean;
  /** Highlight within homepage collections (migration 033). */
  featured_collection: boolean;
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
    parent_id: IDS.rental,
    sort_order: 10,
    is_visible: true,
    visible_in_navigation: true,
    show_on_homepage: true,
    featured_collection: false,
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
    /** Admin parent group only — never a customer browsing category. */
    visible_in_navigation: false,
    show_on_homepage: false,
    featured_collection: false,
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
    visible_in_navigation: true,
    show_on_homepage: true,
    featured_collection: false,
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
    parent_id: IDS.rental,
    sort_order: 40,
    is_visible: true,
    visible_in_navigation: true,
    show_on_homepage: true,
    featured_collection: false,
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
    visible_in_navigation: true,
    show_on_homepage: true,
    featured_collection: false,
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
    visible_in_navigation: true,
    show_on_homepage: true,
    featured_collection: false,
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
    visible_in_navigation: true,
    show_on_homepage: true,
    featured_collection: false,
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

/** Published (not soft-hidden). */
export function isPublishedCategory(
  category: Pick<Category, "is_visible">
): boolean {
  return category.is_visible !== false;
}

/** Eligible for header / mobile navigation. */
export function isNavVisibleCategory(
  category: Pick<Category, "is_visible" | "visible_in_navigation">
): boolean {
  return (
    isPublishedCategory(category) && category.visible_in_navigation !== false
  );
}

/** Eligible for homepage collections section. */
export function isHomepageCategory(
  category: Pick<Category, "is_visible" | "show_on_homepage">
): boolean {
  return isPublishedCategory(category) && category.show_on_homepage !== false;
}

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

/** Normalize optional product_kind from DB (missing column → infer from legacy_key / slug). */
export function resolveCategoryProductKind(
  category: Pick<Category, "product_kind" | "legacy_key"> & {
    slug?: string | null;
  }
): CategoryProductKind | null {
  if (category.product_kind) return category.product_kind;
  const keys = [category.legacy_key, category.slug]
    .map((v) => v?.trim().toLowerCase())
    .filter((v): v is string => Boolean(v));
  if (keys.length === 0) return null;

  const is = (...candidates: string[]) =>
    keys.some((key) => {
      const hyphen = key.replace(/_/g, "-");
      const underscore = key.replace(/-/g, "_");
      return candidates.some(
        (c) => key === c || hyphen === c || underscore === c
      );
    });

  if (is("wedding", "wedding_dress", "wedding-dresses", "rental", "custom_design", "nouf_dresses", "nouf_dress", "nouf-dresses")) {
    return "dress";
  }
  if (is("veils", "veil")) return "veil";
  if (is("bridal_robes", "bridal_robe", "bridal_cape", "robes", "robe")) {
    return "bridal_robe";
  }
  if (is("bridal_accessories", "bridal-accessories", "accessories")) {
    return "accessories_group";
  }
  return null;
}

export function isAccessoriesGroupCategory(
  category: Pick<Category, "product_kind" | "legacy_key">
): boolean {
  return resolveCategoryProductKind(category) === "accessories_group";
}

/**
 * Custom Dress Design is a standalone admin module — not a product category
 * in the Products sidebar (even if a matching categories row exists).
 */
export function isCustomDesignModuleCategory(
  category: Pick<Category, "legacy_key" | "slug">
): boolean {
  const legacy = category.legacy_key?.trim().toLowerCase() ?? "";
  const slug = category.slug?.trim().toLowerCase() ?? "";
  return (
    legacy === "custom_design" ||
    slug === "custom-design" ||
    slug === "custom_design"
  );
}

/**
 * Resolve seed/legacy category keys against a live Category row
 * (legacy_key, slug, or hyphen/underscore variants).
 */
export function categoryMatchesLegacyKeys(
  category: Pick<Category, "legacy_key" | "slug">,
  keys: readonly string[]
): boolean {
  const legacy = category.legacy_key?.trim().toLowerCase() ?? "";
  const slug = category.slug?.trim().toLowerCase() ?? "";
  return keys.some((raw) => {
    const key = raw.trim().toLowerCase();
    if (!key) return false;
    const hyphen = key.replace(/_/g, "-");
    const underscore = key.replace(/-/g, "_");
    return (
      legacy === key ||
      legacy === hyphen ||
      legacy === underscore ||
      slug === key ||
      slug === hyphen ||
      slug === underscore
    );
  });
}

/**
 * Flat Products sidebar order: pin known commerce seeds (resolved from DB),
 * then remaining visible categories by sort_order. Excludes custom_design.
 */
export function orderAdminProductSidebarCategories(
  categories: readonly Category[]
): Category[] {
  const productCats = categories.filter(
    (c) => !isCustomDesignModuleCategory(c) && c.is_visible !== false
  );
  const pinGroups: readonly (readonly string[])[] = [
    ["wedding", "wedding_dress", "wedding-dresses"],
    ["nouf_dresses", "nouf_dress", "nouf-dresses"],
    ["bridal_accessories", "bridal-accessories", "accessories"],
  ];
  const used = new Set<string>();
  const pinned: Category[] = [];
  for (const keys of pinGroups) {
    const found = productCats.find(
      (c) => !used.has(c.id) && categoryMatchesLegacyKeys(c, keys)
    );
    if (found) {
      pinned.push(found);
      used.add(found.id);
    }
  }
  const rest = productCats
    .filter((c) => !used.has(c.id))
    .slice()
    .sort(
      (a, b) =>
        a.sort_order - b.sort_order ||
        a.name_ar.localeCompare(b.name_ar, "ar")
    );
  return [...pinned, ...rest];
}

/**
 * Rental Dresses parent group only (not a customer browse leaf).
 * Identified by seed legacy_key/slug — never by Arabic display name.
 */
export const RENTAL_GROUP_CATEGORY_KEYS = [
  "rental",
  "rental-dresses",
  "rental_dresses",
] as const;

/**
 * @deprecated Prefer parent_id under rental group. Kept for pre-migration
 * flat wedding/nouf rows that still lack parent_id.
 */
export const RENTAL_LEGACY_CHILD_CATEGORY_KEYS = [
  "wedding",
  "wedding_dress",
  "wedding-dresses",
  "nouf_dresses",
  "nouf_dress",
  "nouf-dresses",
] as const;

/** @deprecated Use RENTAL_GROUP + parent_id children. */
export const RENTAL_SIDEBAR_CATEGORY_KEYS = [
  ...RENTAL_GROUP_CATEGORY_KEYS,
  ...RENTAL_LEGACY_CHILD_CATEGORY_KEYS,
] as const;

/** Bridal accessories group + children keys. */
export const ACCESSORY_SIDEBAR_CATEGORY_KEYS = [
  "bridal_accessories",
  "bridal-accessories",
  "accessories",
  "veils",
  "veil",
  "bridal_robes",
  "bridal_robe",
  "bridal_cape",
  "robes",
  "robe",
] as const;

export function isRentalGroupCategory(
  category: Pick<Category, "legacy_key" | "slug">
): boolean {
  return categoryMatchesLegacyKeys(category, RENTAL_GROUP_CATEGORY_KEYS);
}

export function isRentalSidebarCategory(
  category: Pick<Category, "legacy_key" | "slug" | "parent_id">,
  rentalParentId?: string | null
): boolean {
  if (isRentalGroupCategory(category)) return true;
  if (rentalParentId && category.parent_id === rentalParentId) return true;
  return categoryMatchesLegacyKeys(category, RENTAL_LEGACY_CHILD_CATEGORY_KEYS);
}

export function isAccessorySidebarCategory(
  category: Pick<Category, "legacy_key" | "slug" | "product_kind" | "parent_id">
): boolean {
  if (isAccessoriesGroupCategory(category)) return true;
  const kind = resolveCategoryProductKind(category);
  if (kind === "veil" || kind === "bridal_robe") return true;
  return categoryMatchesLegacyKeys(category, ACCESSORY_SIDEBAR_CATEGORY_KEYS);
}

function sortAdminSidebarCategories(a: Category, b: Category): number {
  return (
    a.sort_order - b.sort_order || a.name_ar.localeCompare(b.name_ar, "ar")
  );
}

export type AdminProductSidebarGroups = {
  /** Parent group label only — never a product filter link. */
  rentalParent: Category | null;
  /** Dynamic children via parent_id (+ legacy flat wedding/nouf until migrated). */
  rentalChildren: Category[];
  accessoriesParent: Category | null;
  accessoriesChildren: Category[];
  rest: Category[];
};

/**
 * Products sidebar model: Rental (collapsible parent + dynamic children),
 * Bridal Accessories, then remaining categories.
 * New Admin categories under Rental appear automatically via parent_id.
 */
export function buildAdminProductSidebarGroups(
  categories: readonly Category[]
): AdminProductSidebarGroups {
  const productCats = categories.filter(
    (c) => !isCustomDesignModuleCategory(c) && c.is_visible !== false
  );

  const rentalParent =
    productCats.find((c) => isRentalGroupCategory(c)) ?? null;
  const rentalParentId = rentalParent?.id ?? null;

  const rentalChildIds = new Set<string>();
  const rentalChildren: Category[] = [];

  for (const c of productCats) {
    if (rentalParent && c.id === rentalParent.id) continue;
    const underParent = Boolean(
      rentalParentId && c.parent_id === rentalParentId
    );
    const legacyFlatChild =
      !underParent &&
      categoryMatchesLegacyKeys(c, RENTAL_LEGACY_CHILD_CATEGORY_KEYS);
    if (underParent || legacyFlatChild) {
      rentalChildren.push(c);
      rentalChildIds.add(c.id);
    }
  }
  rentalChildren.sort(sortAdminSidebarCategories);

  const accessoriesParent =
    productCats.find((c) => isAccessoriesGroupCategory(c)) ?? null;
  const accessoriesParentId = accessoriesParent?.id ?? null;
  const accessoriesChildIds = new Set<string>();
  const accessoriesChildren: Category[] = [];

  for (const c of productCats) {
    if (accessoriesParent && c.id === accessoriesParent.id) continue;
    if (rentalChildIds.has(c.id) || (rentalParent && c.id === rentalParent.id)) {
      continue;
    }
    const underParent = Boolean(
      accessoriesParentId && c.parent_id === accessoriesParentId
    );
    const kind = resolveCategoryProductKind(c);
    const accessoryLeaf =
      underParent ||
      kind === "veil" ||
      kind === "bridal_robe" ||
      categoryMatchesLegacyKeys(c, ACCESSORY_SIDEBAR_CATEGORY_KEYS);
    if (accessoryLeaf && !isAccessoriesGroupCategory(c)) {
      accessoriesChildren.push(c);
      accessoriesChildIds.add(c.id);
    }
  }
  accessoriesChildren.sort(sortAdminSidebarCategories);

  const used = new Set<string>([
    ...rentalChildIds,
    ...accessoriesChildIds,
    ...(rentalParent ? [rentalParent.id] : []),
    ...(accessoriesParent ? [accessoriesParent.id] : []),
  ]);

  const rest = productCats
    .filter((c) => !used.has(c.id))
    .slice()
    .sort(sortAdminSidebarCategories);

  return {
    rentalParent,
    rentalChildren,
    accessoriesParent,
    accessoriesChildren,
    rest,
  };
}

/**
 * Flat grouped lists (compat). Rental list is children only — parent is not a leaf.
 */
export function groupAdminProductSidebarCategories(
  categories: readonly Category[]
): {
  rental: Category[];
  accessories: Category[];
  rest: Category[];
} {
  const g = buildAdminProductSidebarGroups(categories);
  return {
    rental: g.rentalChildren,
    accessories: [
      ...(g.accessoriesParent ? [g.accessoriesParent] : []),
      ...g.accessoriesChildren,
    ],
    rest: g.rest,
  };
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

/**
 * Admin Products sidebar href for a category — by product_kind / legacy, never by name.
 * - veil → /admin/veils (own table manager)
 * - bridal_robe → /admin/bridal-robes
 * - accessories_group → null (no single admin list; children are the links)
 * - dress / default → /admin/dresses?category=<id>
 */
export function adminCategoryProductsHref(
  category: Pick<Category, "id" | "product_kind" | "legacy_key" | "slug">
): string | null {
  const kind = resolveCategoryProductKind(category);
  if (kind === "veil") return "/admin/veils";
  if (kind === "bridal_robe") return "/admin/bridal-robes";
  if (kind === "accessories_group") return null;
  return `/admin/dresses?category=${encodeURIComponent(category.id)}`;
}

/** Whether an Admin Products sidebar category link is active for the current route. */
export function isAdminCategoryNavActive(
  category: Pick<Category, "id" | "slug" | "legacy_key" | "product_kind">,
  pathname: string,
  categoryParam: string | null
): boolean {
  const href = adminCategoryProductsHref(category);
  if (href === "/admin/veils") return pathname === "/admin/veils";
  if (href === "/admin/bridal-robes") return pathname === "/admin/bridal-robes";
  if (!href) return false;
  if (pathname !== "/admin/dresses" || !categoryParam) return false;
  return (
    categoryParam === category.id ||
    categoryParam === category.slug ||
    categoryParam === category.legacy_key
  );
}
