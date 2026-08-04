import {
  ACCESSORIES_PARENT,
  DRESS_CATEGORIES,
  DRESS_CATEGORY_HREFS,
  DRESS_CATEGORY_LABELS,
  SHOP_NAV_LINKS,
} from "@/types";
import {
  buildCategoryTree,
  isAccessoriesGroupCategory,
  isDressProductCategory,
  type Category,
  type CategoryTreeNode,
} from "@/types/category";
import { resolveCategoryHref } from "@/lib/categories/href";

export type NavLink = { href: string; label: string };

export type AccessoriesNav = {
  label: string;
  children: NavLink[];
};

export type StorefrontNav = {
  primary: NavLink[];
  accessories: AccessoriesNav;
  /** Flat list of shop category links (with href) for footer */
  categoryLinks: NavLink[];
};

/** Offline fallback only when categories table is empty / unconfigured */
const FALLBACK_PRIMARY: NavLink[] = DRESS_CATEGORIES.map((c) => ({
  href: DRESS_CATEGORY_HREFS[c],
  label: DRESS_CATEGORY_LABELS[c],
}));

const FALLBACK_ACCESSORIES: AccessoriesNav = {
  label: ACCESSORIES_PARENT.label,
  children: [...SHOP_NAV_LINKS],
};

function linkFromCategory(c: Category | CategoryTreeNode): NavLink | null {
  if (c.is_visible === false) return null;
  return { href: resolveCategoryHref(c), label: c.name_ar };
}

/** Flatten nested category tree into nav links (unlimited practical depth). */
function collectNestedLinks(
  nodes: CategoryTreeNode[],
  into: NavLink[]
): void {
  for (const node of nodes) {
    const link = linkFromCategory(node);
    if (link) into.push(link);
    if (node.children.length) collectNestedLinks(node.children, into);
  }
}

/** Build header/footer nav from categories; falls back to static labels if empty. */
export function buildStorefrontNav(categories: Category[]): StorefrontNav {
  if (!categories.length) {
    return {
      primary: FALLBACK_PRIMARY,
      accessories: FALLBACK_ACCESSORIES,
      categoryLinks: [...FALLBACK_PRIMARY, ...FALLBACK_ACCESSORIES.children],
    };
  }

  // Caller should pass getStorefrontCategories() (visible DB categories).
  const tree = buildCategoryTree(categories.filter((c) => c.is_visible));
  const primary: NavLink[] = [];
  let accessories: AccessoriesNav = { ...FALLBACK_ACCESSORIES, children: [] };
  const categoryLinks: NavLink[] = [];
  let sawAccessoriesGroup = false;

  for (const root of tree) {
    if (isAccessoriesGroupCategory(root)) {
      sawAccessoriesGroup = true;
      accessories = {
        label: root.name_ar || FALLBACK_ACCESSORIES.label,
        children: [],
      };
      collectNestedLinks(root.children, accessories.children);
      for (const child of accessories.children) {
        categoryLinks.push(child);
      }
      continue;
    }

    const link = linkFromCategory(root);
    if (link) {
      // Dress sections + any new Admin root category (product_kind dress/null)
      if (isDressProductCategory(root) || !root.parent_id) {
        primary.push(link);
      }
      categoryLinks.push(link);
      // Nested dress children also appear in flat footer links
      collectNestedLinks(root.children, categoryLinks);
    }
  }

  // Offline / empty-DB fallback only — never overwrite a DB-built accessories group
  // with hardcoded SHOP_NAV_LINKS when the group simply has no children yet.
  if (!primary.length && !sawAccessoriesGroup) {
    return {
      primary: FALLBACK_PRIMARY,
      accessories: FALLBACK_ACCESSORIES,
      categoryLinks: [...FALLBACK_PRIMARY, ...FALLBACK_ACCESSORIES.children],
    };
  }

  if (!sawAccessoriesGroup && !accessories.children.length) {
    accessories = FALLBACK_ACCESSORIES;
    for (const child of accessories.children) {
      if (!categoryLinks.some((l) => l.href === child.href)) {
        categoryLinks.push(child);
      }
    }
  }

  return { primary, accessories, categoryLinks };
}

export function buildFooterNavLinks(categoryLinks: NavLink[]): NavLink[] {
  return [
    { href: "/", label: "الرئيسية" },
    ...categoryLinks,
    { href: "/cart", label: "السلة" },
    { href: "/gallery", label: "معرض الصور" },
    { href: "/booking", label: "احجزي موعدًا" },
    { href: "/about", label: "من نحن" },
    { href: "/contact", label: "اتصل بنا" },
  ];
}
