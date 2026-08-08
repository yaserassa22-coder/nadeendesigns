import {
  ACCESSORIES_PARENT,
  DRESS_CATEGORIES,
  DRESS_CATEGORY_HREFS,
  DRESS_CATEGORY_LABELS,
  SHOP_NAV_LINKS,
} from "@/types";
import {
  buildCategoryTree,
  isNavVisibleCategory,
  isRentalGroupCategory,
  type Category,
  type CategoryTreeNode,
} from "@/types/category";
import { resolveCategoryHref } from "@/lib/categories/href";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { resolveCategoryLabel } from "@/lib/i18n/category-labels";
import type { Locale } from "@/lib/i18n/types";

export type NavLink = { href: string; label: string };

/** Child entry for luxury mega / accordion panels — DB fields only, no invented copy. */
export type NavChild = {
  id: string;
  href: string;
  label: string;
  description: string | null;
  coverImageUrl: string | null;
  featured: boolean;
};

export type NavItemKind = "category" | "static" | "more";

/** Root nav entry — leaf link, parent with mega children, or overflow "More". */
export type NavItem = {
  id: string;
  href: string;
  label: string;
  children: NavChild[];
  kind: NavItemKind;
  description: string | null;
  coverImageUrl: string | null;
  featured: boolean;
  /** When kind === "more", overflow parents retained for nested panels. */
  overflowItems?: NavItem[];
};

export type StorefrontNav = {
  /** Capped header bar items (≤ MAX_TOP_LEVEL), including optional المزيد. */
  items: NavItem[];
  /** Flat list of shop category links for footer */
  categoryLinks: NavLink[];
};

/** Max top-level slots in the desktop bar (including Home / static / المزيد). */
export const MAX_TOP_LEVEL_NAV = 7;

function shortDescription(text: string | null | undefined): string | null {
  const t = text?.trim() ?? "";
  if (!t) return null;
  if (t.length <= 90) return t;
  return `${t.slice(0, 87).trimEnd()}…`;
}

function categoryLabel(node: Category | CategoryTreeNode, locale: Locale): string {
  return resolveCategoryLabel(node, locale);
}

function categoryDescription(
  node: Category | CategoryTreeNode,
  locale: Locale
): string | null {
  const n = node as Category & {
    description_en?: string | null;
    description_he?: string | null;
  };
  const t = getDictionary(locale);
  const legacyFb =
    n.legacy_key && (t.home.serviceFallbacks as Record<string, string>)[n.legacy_key]
      ? (t.home.serviceFallbacks as Record<string, string>)[n.legacy_key]
      : "";
  const preferred =
    locale === "he"
      ? (n.description_he ?? "").trim()
      : locale === "en"
        ? (n.description_en ?? "").trim()
        : (n.description_ar ?? "").trim();
  const text =
    preferred ||
    (locale !== "ar" ? legacyFb : "") ||
    (n.description_ar ?? "").trim() ||
    legacyFb;
  return shortDescription(text);
}

function childFromNode(node: CategoryTreeNode, locale: Locale): NavChild | null {
  if (!isNavVisibleCategory(node)) return null;
  return {
    id: node.id,
    href: resolveCategoryHref(node),
    label: categoryLabel(node, locale),
    description: categoryDescription(node, locale),
    coverImageUrl: node.cover_image_url?.trim() || null,
    featured: node.featured_collection === true,
  };
}

/** Flatten nested category tree into nav children (one luxury mega level). */
function collectNestedChildren(
  nodes: CategoryTreeNode[],
  into: NavChild[],
  locale: Locale
): void {
  for (const node of nodes) {
    const child = childFromNode(node, locale);
    if (child) into.push(child);
    if (node.children.length) collectNestedChildren(node.children, into, locale);
  }
}

function navChildrenFromNode(
  node: CategoryTreeNode,
  locale: Locale = "ar"
): NavChild[] {
  const children: NavChild[] = [];
  for (const childNode of node.children) {
    const child = childFromNode(childNode, locale);
    if (!child) continue;
    if (childNode.children.length) {
      children.push(child);
      collectNestedChildren(childNode.children, children, locale);
    } else {
      children.push(child);
    }
  }
  return children;
}

function itemFromRoot(root: CategoryTreeNode, locale: Locale): NavItem | null {
  if (!isNavVisibleCategory(root)) return null;
  return {
    id: root.id,
    href: resolveCategoryHref(root),
    label: categoryLabel(root, locale),
    children: navChildrenFromNode(root, locale),
    kind: "category",
    description: categoryDescription(root, locale),
    coverImageUrl: root.cover_image_url?.trim() || null,
    featured: root.featured_collection === true,
  };
}

/**
 * Rental Dresses is an Admin parent group only — never a customer browse root.
 * Promote nav-visible children to top-level; skip empty parents.
 */
function expandStorefrontRoots(roots: CategoryTreeNode[]): CategoryTreeNode[] {
  const out: CategoryTreeNode[] = [];
  for (const root of roots) {
    if (isRentalGroupCategory(root)) {
      for (const child of root.children) {
        if (isNavVisibleCategory(child)) out.push(child);
      }
      continue;
    }
    if (!isNavVisibleCategory(root)) {
      // Parent hidden from nav but children may still browse.
      for (const child of root.children) {
        if (isNavVisibleCategory(child)) out.push(child);
      }
      continue;
    }
    out.push(root);
  }
  return out;
}

function staticItem(id: string, href: string, label: string): NavItem {
  return {
    id,
    href,
    label,
    children: [],
    kind: "static",
    description: null,
    coverImageUrl: null,
    featured: false,
  };
}

/** Site pages mixed into the bar — labels are page names, not category names. */
function staticSiteLinks(locale: Locale): NavItem[] {
  const t = getDictionary(locale);
  return [
    staticItem("nav-home", "/", t.common.home),
    staticItem("nav-booking", "/booking", t.nav.booking),
    staticItem("nav-about", "/about", t.nav.about),
    staticItem("nav-contact", "/contact", t.nav.contact),
    staticItem("nav-gallery", "/gallery", t.nav.gallery),
  ];
}

/** Offline fallback only when categories table is empty / unconfigured */
const FALLBACK_CATEGORY_ITEMS: NavItem[] = [
  ...DRESS_CATEGORIES.filter((c) => c !== "rental" && c !== "custom_design").map(
    (c) =>
      staticItem(`fallback-${c}`, DRESS_CATEGORY_HREFS[c], DRESS_CATEGORY_LABELS[c])
  ).map((item) => ({ ...item, kind: "category" as const })),
  {
    id: "fallback-accessories",
    href: ACCESSORIES_PARENT.children[0]?.href ?? "/veils",
    label: ACCESSORIES_PARENT.label,
    children: SHOP_NAV_LINKS.map((link, i) => ({
      id: `fallback-acc-${i}`,
      href: link.href,
      label: link.label,
      description: null,
      coverImageUrl: null,
      featured: false,
    })),
    kind: "category",
    description: null,
    coverImageUrl: null,
    featured: false,
  },
];

function dedupeByHref(items: NavItem[]): NavItem[] {
  const seen = new Set<string>();
  const out: NavItem[] = [];
  for (const item of items) {
    if (seen.has(item.href)) continue;
    seen.add(item.href);
    out.push(item);
  }
  return out;
}

/**
 * Cap the top bar at MAX_TOP_LEVEL_NAV.
 * Priority: Home → category parents (sort_order) → other static pages.
 * Overflow category parents collapse into an elegant "المزيد" item.
 */
export function capTopLevelNav(
  categoryItems: NavItem[],
  max = MAX_TOP_LEVEL_NAV,
  locale: Locale = "ar"
): NavItem[] {
  const t = getDictionary(locale);
  const STATIC_SITE_LINKS = staticSiteLinks(locale);
  const home = STATIC_SITE_LINKS[0]!;
  const staticRest = STATIC_SITE_LINKS.slice(1);
  const categoryHrefs = new Set(categoryItems.map((c) => c.href));
  const staticExtras = staticRest.filter((s) => !categoryHrefs.has(s.href));

  const unlimited = dedupeByHref([home, ...categoryItems, ...staticExtras]);
  if (unlimited.length <= max) return unlimited;

  // Reserve Home + optional المزيد; prefer keeping categories in the bar.
  const reserveMore = 1;
  const preferredStaticCount = Math.min(2, staticExtras.length);
  const categoryBudget = Math.max(
    1,
    max - 1 - reserveMore - preferredStaticCount
  );

  const primaryCategories = categoryItems.slice(0, categoryBudget);
  const overflowCategories = categoryItems.slice(categoryBudget);

  let bar = dedupeByHref([home, ...primaryCategories]);

  if (overflowCategories.length) {
    bar.push({
      id: "nav-more",
      href: overflowCategories[0]!.href,
      label: t.nav.more,
      children: overflowCategories.flatMap((item) =>
        item.children.length
          ? item.children
          : [
              {
                id: item.id,
                href: item.href,
                label: item.label,
                description: item.description,
                coverImageUrl: item.coverImageUrl,
                featured: item.featured,
              },
            ]
      ),
      kind: "more",
      description: null,
      coverImageUrl: null,
      featured: false,
      overflowItems: overflowCategories,
    });
  }

  for (const s of staticExtras) {
    if (bar.length >= max) break;
    if (bar.some((b) => b.href === s.href)) continue;
    bar.push(s);
  }

  // If still over (edge case), trim trailing statics only.
  if (bar.length > max) {
    bar = bar.slice(0, max);
  }

  return bar;
}

function fallbackNav(locale: Locale = "ar"): StorefrontNav {
  const items = capTopLevelNav(FALLBACK_CATEGORY_ITEMS, MAX_TOP_LEVEL_NAV, locale);
  return {
    items,
    categoryLinks: FALLBACK_CATEGORY_ITEMS.flatMap((item) =>
      item.children.length
        ? item.children.map((c) => ({ href: c.href, label: c.label }))
        : [{ href: item.href, label: item.label }]
    ),
  };
}

/** Build header/footer nav from categories; falls back to static labels if empty. */
export function buildStorefrontNav(
  categories: Category[],
  locale: Locale = "ar"
): StorefrontNav {
  if (!categories.length) return fallbackNav(locale);

  // Keep full published set for tree links; nav visibility applied when expanding.
  const published = categories.filter((c) => c.is_visible !== false);
  const tree = buildCategoryTree(published);
  const roots = expandStorefrontRoots(tree);
  const categoryItems: NavItem[] = [];
  const categoryLinks: NavLink[] = [];

  for (const root of roots) {
    const item = itemFromRoot(root, locale);
    if (!item) continue;
    // Skip empty parent shells (no href leaf and no children) — never show hollow groups.
    if (!item.children.length && isRentalGroupCategory(root)) continue;
    categoryItems.push(item);
    if (item.children.length) {
      for (const child of item.children) {
        categoryLinks.push({ href: child.href, label: child.label });
      }
    } else {
      categoryLinks.push({ href: item.href, label: item.label });
    }
  }

  if (!categoryItems.length) return fallbackNav();

  return {
    items: capTopLevelNav(categoryItems, MAX_TOP_LEVEL_NAV, locale),
    categoryLinks,
  };
}

export function buildFooterNavLinks(
  categoryLinks: NavLink[],
  locale: Locale = "ar"
): NavLink[] {
  const t = getDictionary(locale);
  return [
    { href: "/", label: t.common.home },
    ...categoryLinks,
    { href: "/cart", label: t.nav.cart },
    { href: "/gallery", label: t.nav.gallery },
    { href: "/booking", label: t.nav.booking },
    { href: "/about", label: t.nav.about },
    { href: "/contact", label: t.nav.contact },
  ];
}
