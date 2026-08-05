"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  Menu,
  Settings2,
  X,
} from "lucide-react";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ADMIN_CATEGORIES_CHANGED_EVENT } from "@/lib/admin/category-events";
import {
  buildCategoryTree,
  type Category,
  type CategoryTreeNode,
} from "@/types/category";

type CategoryWithCount = Category & { product_count?: number };

/** Top-level modules — never hardcode product-category shortcuts here. */
const PRIMARY_LINKS = [
  { href: "/admin", label: "لوحة التحكم", exact: true },
] as const;

const MODULE_LINKS = [
  { href: "/admin/gallery", label: "🖼️ المعرض" },
  { href: "/admin/bookings", label: "📅 الحجوزات" },
  { href: "/admin/calendar", label: "🗓️ تقويم المواعيد" },
  { href: "/admin/appointments/analytics", label: "📈 تحليلات المواعيد" },
  { href: "/admin/orders", label: "🛒 الطلبات" },
  { href: "/admin/customers", label: "👥 العملاء" },
  { href: "/admin/guests", label: "🕊️ ضيوف المتجر" },
  { href: "/admin/shipping", label: "🚚 إعدادات الشحن" },
  { href: "/admin/notifications", label: "🔔 الإشعارات" },
  { href: "/admin/messages", label: "💬 الرسائل" },
  { href: "/admin/activity", label: "📋 سجل النشاط" },
  { href: "/admin/trash", label: "🗑️ سلة المحذوفات" },
  { href: "/admin/content/home", label: "🏠 محتوى الرئيسية" },
  { href: "/admin/content/about", label: "📖 محتوى من نحن" },
  { href: "/admin/reports", label: "📊 التقارير" },
  { href: "/admin/settings", label: "⚙️ إعدادات المتجر" },
] as const;

function categoryProductsHref(categoryId: string): string {
  return `/admin/dresses?category=${encodeURIComponent(categoryId)}`;
}

function isLinkActive(
  href: string,
  pathname: string,
  category: string | null,
  collection: string | null,
  exact?: boolean
) {
  if (exact) return pathname === href;

  if (href.includes("?")) {
    const [path, query] = href.split("?");
    const params = new URLSearchParams(query);
    const hrefCategory = params.get("category");
    const hrefCollection = params.get("collection");
    if (pathname !== path) return false;
    if (hrefCollection) {
      return collection === hrefCollection && !category;
    }
    if (hrefCategory) {
      return category === hrefCategory;
    }
    return !category && !collection;
  }

  if (href === "/admin/dresses") {
    return pathname === "/admin/dresses" && !category && !collection;
  }

  if (pathname.startsWith(href + "/") || pathname === href) {
    return true;
  }
  return false;
}

function isCategoryNavActive(
  c: Category,
  pathname: string,
  categoryParam: string | null
) {
  if (pathname !== "/admin/dresses" || !categoryParam) return false;
  return (
    categoryParam === c.id ||
    categoryParam === c.slug ||
    categoryParam === c.legacy_key
  );
}

function NavLink({
  href,
  label,
  active,
  onNavigate,
  className,
}: {
  href: string;
  label: ReactNode;
  active: boolean;
  onNavigate: () => void;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
        active
          ? "bg-gold text-white shadow-sm shadow-gold/20"
          : "text-charcoal hover:bg-beige",
        className
      )}
    >
      {label}
    </Link>
  );
}

function SectionToggle({
  label,
  open,
  onToggle,
  active,
  trailing,
}: {
  label: ReactNode;
  open: boolean;
  onToggle: () => void;
  active?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-xl",
        open || active ? "bg-beige/60" : ""
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
          open || active
            ? "text-charcoal"
            : "text-charcoal hover:bg-beige"
        )}
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted transition-transform",
            open ? "rotate-0" : "-rotate-90"
          )}
        />
        <span className="truncate">{label}</span>
      </button>
      {trailing}
    </div>
  );
}

function CategoryTreeItem({
  node,
  depth,
  pathname,
  categoryParam,
  expandedIds,
  toggleExpand,
  onNavigate,
}: {
  node: CategoryTreeNode & { product_count?: number };
  depth: number;
  pathname: string;
  categoryParam: string | null;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  onNavigate: () => void;
}) {
  const hasChildren = node.children.length > 0;
  const expanded = expandedIds.has(node.id);
  const active = isCategoryNavActive(node, pathname, categoryParam);
  const count = node.product_count ?? 0;
  const href = categoryProductsHref(node.id);

  return (
    <li>
      <div
        className={cn(
          "flex items-center gap-0.5 rounded-lg text-sm transition-colors",
          active
            ? "bg-gold/15 text-charcoal"
            : "text-charcoal/90 hover:bg-beige"
        )}
        style={{ paddingInlineStart: `${Math.min(depth, 4) * 0.65 + 0.25}rem` }}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={expanded ? "طي التصنيف" : "توسيع التصنيف"}
            onClick={() => toggleExpand(node.id)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-beige-dark/40 hover:text-charcoal"
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                expanded ? "rotate-0" : "-rotate-90"
              )}
            />
          </button>
        ) : (
          <span className="inline-block w-8 shrink-0" aria-hidden />
        )}

        <Link
          href={href}
          onClick={onNavigate}
          className={cn(
            "min-w-0 flex-1 truncate py-2 pe-2 text-start",
            active ? "font-semibold text-gold" : "font-medium"
          )}
        >
          {node.name_ar}
          <span className={cn("ms-1", active ? "text-gold/80" : "text-muted")}>
            ({count})
          </span>
        </Link>
      </div>

      {hasChildren && expanded && (
        <ul className="space-y-0.5">
          {node.children.map((child) => (
            <CategoryTreeItem
              key={child.id}
              node={child as CategoryTreeNode & { product_count?: number }}
              depth={depth + 1}
              pathname={pathname}
              categoryParam={categoryParam}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function useAdminSidebarCategories() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/categories?counts=1", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as unknown;
      if (!Array.isArray(data)) return;
      setCategories(data as CategoryWithCount[]);
    } catch {
      /* keep previous */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refetch();
    }, 0);
    const onFocus = () => {
      void refetch();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    const onChanged = () => {
      void refetch();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener(ADMIN_CATEGORIES_CHANGED_EVENT, onChanged);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(ADMIN_CATEGORIES_CHANGED_EVENT, onChanged);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refetch]);

  const visible = useMemo(
    () => categories.filter((c) => c.is_visible !== false),
    [categories]
  );

  return { categories: visible, loaded };
}

function ProductsNavSection({
  pathname,
  categoryParam,
  collectionParam,
  onNavigate,
}: {
  pathname: string;
  categoryParam: string | null;
  collectionParam: string | null;
  onNavigate: () => void;
}) {
  const { categories, loaded } = useAdminSidebarCategories();

  const routeWantsProductsOpen =
    pathname.startsWith("/admin/dresses") ||
    pathname.startsWith("/admin/categories");
  const routeKey = `${pathname}|${categoryParam ?? ""}|${collectionParam ?? ""}`;
  const [sectionRouteKey, setSectionRouteKey] = useState(routeKey);
  const [productsOpen, setProductsOpen] = useState(routeWantsProductsOpen);
  const [categoriesOpen, setCategoriesOpen] = useState(
    Boolean(categoryParam) || pathname.startsWith("/admin/categories")
  );
  const [collectionsOpen, setCollectionsOpen] = useState(
    collectionParam === "1"
  );

  const featuredCategoryActive = useMemo(() => {
    if (!categoryParam || !categories.length) return false;
    return categories.some(
      (c) =>
        c.featured_collection === true &&
        (c.id === categoryParam ||
          c.slug === categoryParam ||
          c.legacy_key === categoryParam)
    );
  }, [categoryParam, categories]);

  if (sectionRouteKey !== routeKey) {
    setSectionRouteKey(routeKey);
    if (routeWantsProductsOpen) setProductsOpen(true);
    if (categoryParam || pathname.startsWith("/admin/categories")) {
      setCategoriesOpen(true);
    }
    if (collectionParam === "1") setCollectionsOpen(true);
  }

  const collectionsHintKey = `${collectionParam ?? ""}|${categoryParam ?? ""}|${featuredCategoryActive}`;
  const [collectionsHintPrev, setCollectionsHintPrev] =
    useState(collectionsHintKey);
  if (collectionsHintPrev !== collectionsHintKey) {
    setCollectionsHintPrev(collectionsHintKey);
    if (collectionParam === "1" || featuredCategoryActive) {
      setCollectionsOpen(true);
    }
  }

  const [userExpandedIds, setUserExpandedIds] = useState<Set<string>>(
    () => new Set()
  );

  const tree = useMemo(() => {
    const nodes = buildCategoryTree(categories);
    return nodes as Array<CategoryTreeNode & { product_count?: number }>;
  }, [categories]);

  const collections = useMemo(
    () =>
      categories
        .filter((c) => c.featured_collection === true)
        .slice()
        .sort(
          (a, b) =>
            a.sort_order - b.sort_order ||
            a.name_ar.localeCompare(b.name_ar, "ar")
        ),
    [categories]
  );

  const ancestorExpandedIds = useMemo(() => {
    const ids = new Set<string>();
    if (!categoryParam || !categories.length) return ids;
    const active = categories.find(
      (c) =>
        c.id === categoryParam ||
        c.slug === categoryParam ||
        c.legacy_key === categoryParam
    );
    if (!active) return ids;
    const byId = new Map(categories.map((c) => [c.id, c]));
    let cur: Category | undefined = active;
    while (cur?.parent_id) {
      ids.add(cur.parent_id);
      cur = byId.get(cur.parent_id);
    }
    return ids;
  }, [categoryParam, categories]);

  const expandedIds = useMemo(() => {
    const merged = new Set(userExpandedIds);
    for (const id of ancestorExpandedIds) merged.add(id);
    return merged;
  }, [userExpandedIds, ancestorExpandedIds]);

  const toggleExpand = (id: string) => {
    setUserExpandedIds((prev) => {
      const next = new Set(prev);
      if (prev.has(id) || ancestorExpandedIds.has(id)) {
        next.delete(id);
        return next;
      }
      next.add(id);
      return next;
    });
  };

  const allProductsActive = isLinkActive(
    "/admin/dresses",
    pathname,
    categoryParam,
    collectionParam
  );
  const manageActive = pathname.startsWith("/admin/categories");
  const collectionsHubActive =
    pathname === "/admin/dresses" && collectionParam === "1";

  return (
    <div className="space-y-1">
      <SectionToggle
        label="👰 المنتجات"
        open={productsOpen}
        onToggle={() => setProductsOpen((o) => !o)}
        active={routeWantsProductsOpen}
      />

      {productsOpen && (
        <div className="ms-1 space-y-1 border-r border-beige-dark/70 pe-1">
          <NavLink
            href="/admin/dresses"
            label="كل المنتجات"
            active={allProductsActive}
            onNavigate={onNavigate}
            className="px-3 py-2 text-sm"
          />

          {/* Categories subtree */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-0.5 rounded-lg">
              <button
                type="button"
                aria-expanded={categoriesOpen}
                onClick={() => setCategoriesOpen((o) => !o)}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  categoriesOpen || manageActive
                    ? "bg-beige/60 text-charcoal"
                    : "text-charcoal hover:bg-beige"
                )}
              >
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-muted transition-transform",
                    categoriesOpen ? "rotate-0" : "-rotate-90"
                  )}
                />
                <span className="truncate">التصنيفات</span>
              </button>
              <Link
                href="/admin/categories"
                onClick={onNavigate}
                title="إدارة التصنيفات"
                aria-label="إدارة التصنيفات"
                className={cn(
                  "me-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors",
                  manageActive
                    ? "bg-gold text-white"
                    : "text-muted hover:bg-beige hover:text-charcoal"
                )}
              >
                <Settings2 className="h-3.5 w-3.5" />
              </Link>
            </div>

            {categoriesOpen && (
              <div className="ms-1 space-y-0.5 border-r border-beige-dark/50 pe-1">
                <Link
                  href="/admin/categories"
                  onClick={onNavigate}
                  className={cn(
                    "block rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    manageActive
                      ? "bg-gold/15 text-gold"
                      : "text-muted hover:bg-beige hover:text-charcoal"
                  )}
                >
                  إدارة التصنيفات
                </Link>

                {!loaded && (
                  <p className="px-3 py-2 text-xs text-muted">جاري التحميل…</p>
                )}

                {loaded && tree.length === 0 && (
                  <p className="px-3 py-2 text-xs text-muted">
                    لا توجد تصنيفات ظاهرة
                  </p>
                )}

                {tree.length > 0 && (
                  <ul className="space-y-0.5 pb-1">
                    {tree.map((node) => (
                      <CategoryTreeItem
                        key={node.id}
                        node={node}
                        depth={0}
                        pathname={pathname}
                        categoryParam={categoryParam}
                        expandedIds={expandedIds}
                        toggleExpand={toggleExpand}
                        onNavigate={onNavigate}
                      />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Collections — featured_collection rows from Categories table */}
          <div className="space-y-0.5">
            <button
              type="button"
              aria-expanded={collectionsOpen}
              onClick={() => setCollectionsOpen((o) => !o)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                collectionsOpen || collectionsHubActive
                  ? "bg-beige/60 text-charcoal"
                  : "text-charcoal hover:bg-beige"
              )}
            >
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-muted transition-transform",
                  collectionsOpen ? "rotate-0" : "-rotate-90"
                )}
              />
              <span className="truncate">المجموعات</span>
            </button>

            {collectionsOpen && (
              <div className="ms-1 space-y-0.5 border-r border-beige-dark/50 pe-1">
                <Link
                  href="/admin/dresses?collection=1"
                  onClick={onNavigate}
                  className={cn(
                    "block rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    collectionsHubActive
                      ? "bg-gold/15 text-gold"
                      : "text-muted hover:bg-beige hover:text-charcoal"
                  )}
                >
                  كل المجموعات المميزة
                </Link>

                {!loaded && (
                  <p className="px-3 py-2 text-xs text-muted">جاري التحميل…</p>
                )}

                {loaded && collections.length === 0 && (
                  <p className="px-3 py-2 text-xs text-muted">
                    لا توجد مجموعات مميزة — فعّلي «مجموعة مميزة» من التصنيفات
                  </p>
                )}

                {collections.length > 0 && (
                  <ul className="space-y-0.5 pb-1">
                    {collections.map((c) => {
                      const active = isCategoryNavActive(
                        c,
                        pathname,
                        categoryParam
                      );
                      const count = c.product_count ?? 0;
                      return (
                        <li key={c.id}>
                          <Link
                            href={categoryProductsHref(c.id)}
                            onClick={onNavigate}
                            className={cn(
                              "block truncate rounded-lg px-3 py-2 text-sm transition-colors",
                              active
                                ? "bg-gold/15 font-semibold text-gold"
                                : "font-medium text-charcoal/90 hover:bg-beige"
                            )}
                          >
                            {c.name_ar}
                            <span
                              className={cn(
                                "ms-1",
                                active ? "text-gold/80" : "text-muted"
                              )}
                            >
                              ({count})
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminSidebarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const category = searchParams.get("category");
  const collection = searchParams.get("collection");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const closeMobile = () => setOpen(false);

  const logout = async () => {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/admin/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  const Nav = (
    <div className="flex h-full flex-col">
      <div className="border-b border-beige-dark px-6 py-6">
        <Link href="/admin" className="block" onClick={closeMobile}>
          <p className="font-[family-name:var(--font-cormorant)] text-xl font-semibold tracking-widest text-gold">
            {SITE_NAME}
          </p>
          <p className="mt-1 text-xs text-muted">لوحة الإدارة</p>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {PRIMARY_LINKS.map((link) => (
          <NavLink
            key={link.href}
            href={link.href}
            label={link.label}
            active={isLinkActive(
              link.href,
              pathname,
              category,
              collection,
              "exact" in link ? link.exact : false
            )}
            onNavigate={closeMobile}
          />
        ))}

        <ProductsNavSection
          pathname={pathname}
          categoryParam={category}
          collectionParam={collection}
          onNavigate={closeMobile}
        />

        {MODULE_LINKS.map((link) => (
          <NavLink
            key={link.href}
            href={link.href}
            label={link.label}
            active={isLinkActive(link.href, pathname, category, collection)}
            onNavigate={closeMobile}
          />
        ))}
      </nav>

      <div className="border-t border-beige-dark p-4">
        <Link
          href="/"
          className="mb-2 block rounded-xl px-4 py-2 text-sm text-muted hover:bg-beige hover:text-charcoal"
          onClick={closeMobile}
        >
          عرض الموقع
        </Link>
        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-64 border-l border-beige-dark bg-white lg:block">
        {Nav}
      </aside>

      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-beige-dark bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="فتح القائمة"
          className="rounded-lg p-2 hover:bg-beige"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-[family-name:var(--font-cormorant)] text-lg tracking-widest text-gold">
          {SITE_NAME}
        </span>
        <div className="w-9" />
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-charcoal/40"
            aria-label="إغلاق"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 right-0 w-[min(288px,85vw)] bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 left-4 rounded-lg p-2 hover:bg-beige"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
            {Nav}
          </aside>
        </div>
      )}
    </>
  );
}

export function AdminSidebar() {
  return (
    <Suspense
      fallback={
        <aside className="fixed inset-y-0 right-0 z-40 hidden w-64 border-l border-beige-dark bg-white lg:block" />
      }
    >
      <AdminSidebarInner />
    </Suspense>
  );
}
