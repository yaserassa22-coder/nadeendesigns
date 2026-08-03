import {
  ACCESSORIES_PARENT,
  DRESS_CATEGORIES,
  DRESS_CATEGORY_HREFS,
  DRESS_CATEGORY_LABELS,
  SHOP_NAV_LINKS,
} from "@/types";
import {
  buildCategoryTree,
  type Category,
  type CategoryTreeNode,
} from "@/types/category";
import { resolveCategoryHref } from "@/lib/categories/href";
import { isDressLegacyKey } from "@/lib/categories/kind";

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

/** Build header/footer nav from categories; falls back to static labels if empty. */
export function buildStorefrontNav(categories: Category[]): StorefrontNav {
  if (!categories.length) {
    return {
      primary: FALLBACK_PRIMARY,
      accessories: FALLBACK_ACCESSORIES,
      categoryLinks: [...FALLBACK_PRIMARY, ...FALLBACK_ACCESSORIES.children],
    };
  }

  const tree = buildCategoryTree(categories.filter((c) => c.is_visible));
  const primary: NavLink[] = [];
  let accessories: AccessoriesNav = { ...FALLBACK_ACCESSORIES, children: [] };
  const categoryLinks: NavLink[] = [];

  for (const root of tree) {
    if (root.legacy_key === "bridal_accessories") {
      accessories = {
        label: root.name_ar || FALLBACK_ACCESSORIES.label,
        children: root.children
          .map(linkFromCategory)
          .filter((l): l is NavLink => l !== null),
      };
      for (const child of accessories.children) {
        categoryLinks.push(child);
      }
      continue;
    }

    const link = linkFromCategory(root);
    if (link) {
      if (isDressLegacyKey(root.legacy_key) || !root.parent_id) {
        primary.push(link);
      }
      categoryLinks.push(link);
    }
  }

  if (!primary.length) {
    return {
      primary: FALLBACK_PRIMARY,
      accessories: accessories.children.length
        ? accessories
        : FALLBACK_ACCESSORIES,
      categoryLinks: [
        ...FALLBACK_PRIMARY,
        ...(accessories.children.length
          ? accessories.children
          : FALLBACK_ACCESSORIES.children),
      ],
    };
  }

  if (!accessories.children.length) {
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
