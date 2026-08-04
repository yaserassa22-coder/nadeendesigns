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
  type Category,
  type CategoryTreeNode,
} from "@/types/category";
import { resolveCategoryHref } from "@/lib/categories/href";

export type NavLink = { href: string; label: string };

/** Root nav entry — leaf link or parent with luxury dropdown children. */
export type NavItem = {
  id: string;
  href: string;
  label: string;
  children: NavLink[];
};

export type StorefrontNav = {
  /** Hierarchical header items (parents with children → dropdown). */
  items: NavItem[];
  /** Flat list of shop category links for footer */
  categoryLinks: NavLink[];
};

/** Offline fallback only when categories table is empty / unconfigured */
const FALLBACK_ITEMS: NavItem[] = [
  ...DRESS_CATEGORIES.map((c) => ({
    id: `fallback-${c}`,
    href: DRESS_CATEGORY_HREFS[c],
    label: DRESS_CATEGORY_LABELS[c],
    children: [] as NavLink[],
  })),
  {
    id: "fallback-accessories",
    href: ACCESSORIES_PARENT.children[0]?.href ?? "/veils",
    label: ACCESSORIES_PARENT.label,
    children: [...SHOP_NAV_LINKS],
  },
];

function linkFromCategory(c: Category | CategoryTreeNode): NavLink | null {
  if (!isNavVisibleCategory(c)) return null;
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

function navChildrenFromNode(node: CategoryTreeNode): NavLink[] {
  const children: NavLink[] = [];
  for (const child of node.children) {
    const link = linkFromCategory(child);
    if (!link) continue;
    if (child.children.length) {
      // Nested grandchildren flatten into the parent dropdown (one luxury level).
      children.push(link);
      collectNestedLinks(child.children, children);
    } else {
      children.push(link);
    }
  }
  return children;
}

function itemFromRoot(root: CategoryTreeNode): NavItem | null {
  if (!isNavVisibleCategory(root)) return null;
  const children = navChildrenFromNode(root);
  return {
    id: root.id,
    href: resolveCategoryHref(root),
    label: root.name_ar,
    children,
  };
}

/** Build header/footer nav from categories; falls back to static labels if empty. */
export function buildStorefrontNav(categories: Category[]): StorefrontNav {
  if (!categories.length) {
    return {
      items: FALLBACK_ITEMS,
      categoryLinks: FALLBACK_ITEMS.flatMap((item) =>
        item.children.length
          ? item.children
          : [{ href: item.href, label: item.label }]
      ),
    };
  }

  const navCategories = categories.filter(isNavVisibleCategory);
  const tree = buildCategoryTree(navCategories);
  const items: NavItem[] = [];
  const categoryLinks: NavLink[] = [];

  for (const root of tree) {
    const item = itemFromRoot(root);
    if (!item) continue;
    items.push(item);
    if (item.children.length) {
      for (const child of item.children) {
        categoryLinks.push(child);
      }
    } else {
      categoryLinks.push({ href: item.href, label: item.label });
    }
  }

  if (!items.length) {
    return {
      items: FALLBACK_ITEMS,
      categoryLinks: FALLBACK_ITEMS.flatMap((item) =>
        item.children.length
          ? item.children
          : [{ href: item.href, label: item.label }]
      ),
    };
  }

  return { items, categoryLinks };
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
