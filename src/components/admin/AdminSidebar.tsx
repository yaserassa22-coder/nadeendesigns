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
  resolveCategoryProductKind,
  type Category,
  type CategoryTreeNode,
} from "@/types/category";

type CategoryWithCount = Category & { product_count?: number };

const LINKS_BEFORE_CATEGORIES = [
  { href: "/admin", label: "لوحة التحكم", exact: true },
  { href: "/admin/reports", label: "📊 التقارير" },
] as const;

const LINKS_AFTER_CATEGORIES = [
  { href: "/admin/dresses", label: "👰 المنتجات" },
  { href: "/admin/nouf-dresses", label: "👗 فساتين نوف" },
  { href: "/admin/veils", label: "🕊️ طرحة العروس" },
  { href: "/admin/bridal-robes", label: "🥻 برنص العروس" },
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
  { href: "/admin/settings", label: "⚙️ إعدادات المتجر" },
] as const;

function isLinkActive(
  href: string,
  pathname: string,
  category: string | null,
  exact?: boolean
) {
  if (exact) return pathname === href;

  if (href.includes("?")) {
    const [path, query] = href.split("?");
    const params = new URLSearchParams(query);
    return pathname === path && category === params.get("category");
  }

  if (href === "/admin/dresses") {
    return pathname === "/admin/dresses" && !category;
  }

  if (href === "/admin/nouf-dresses") {
    return pathname === "/admin/nouf-dresses";
  }

  if (pathname.startsWith(href + "/") || pathname === href) {
    return true;
  }
  return false;
}

function categoryProductsHref(c: Category): string {
  const kind = resolveCategoryProductKind(c);
  if (kind === "veil") return "/admin/veils";
  if (kind === "bridal_robe") return "/admin/bridal-robes";
  if (kind === "accessories_group") return "/admin/categories";
  return `/admin/dresses?category=${encodeURIComponent(c.id)}`;
}

function isCategoryNavActive(
  c: Category,
  pathname: string,
  categoryParam: string | null
) {
  const kind = resolveCategoryProductKind(c);
  if (kind === "veil") return pathname === "/admin/veils";
  if (kind === "bridal_robe") return pathname === "/admin/bridal-robes";
  if (kind === "accessories_group") return false;
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
  const href = categoryProductsHref(node);
  const kind = resolveCategoryProductKind(node);
  const isGroup = kind === "accessories_group";

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

        {isGroup && hasChildren ? (
          <button
            type="button"
            onClick={() => toggleExpand(node.id)}
            className="min-w-0 flex-1 truncate py-2 pe-2 text-start font-medium"
          >
            {node.name_ar}
            <span className="ms-1 text-muted">({count})</span>
          </button>
        ) : (
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
        )}
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

function CategoriesNavSection({
  pathname,
  categoryParam,
  onNavigate,
}: {
  pathname: string;
  categoryParam: string | null;
  onNavigate: () => void;
}) {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loaded, setLoaded] = useState(false);

  const routeWantsSectionOpen =
    pathname.startsWith("/admin/categories") ||
    (pathname === "/admin/dresses" && Boolean(categoryParam));
  const routeKey = `${pathname}|${categoryParam ?? ""}`;
  const [sectionRouteKey, setSectionRouteKey] = useState(routeKey);
  const [sectionOpen, setSectionOpen] = useState(routeWantsSectionOpen);
  // Reset open state when the route implies the Categories section should show.
  if (sectionRouteKey !== routeKey) {
    setSectionRouteKey(routeKey);
    if (routeWantsSectionOpen) setSectionOpen(true);
  }

  const [userExpandedIds, setUserExpandedIds] = useState<Set<string>>(
    () => new Set()
  );

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

  const tree = useMemo(() => {
    const nodes = buildCategoryTree(visible);
    return nodes as Array<CategoryTreeNode & { product_count?: number }>;
  }, [visible]);

  const ancestorExpandedIds = useMemo(() => {
    const ids = new Set<string>();
    if (!categoryParam || !visible.length) return ids;
    const active = visible.find(
      (c) =>
        c.id === categoryParam ||
        c.slug === categoryParam ||
        c.legacy_key === categoryParam
    );
    if (!active) return ids;
    const byId = new Map(visible.map((c) => [c.id, c]));
    let cur: Category | undefined = active;
    while (cur?.parent_id) {
      ids.add(cur.parent_id);
      cur = byId.get(cur.parent_id);
    }
    return ids;
  }, [categoryParam, visible]);

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

  const manageActive = pathname.startsWith("/admin/categories");

  return (
    <div className="space-y-1">
      <div
        className={cn(
          "flex items-center gap-0.5 rounded-xl",
          sectionOpen || manageActive ? "bg-beige/60" : ""
        )}
      >
        <button
          type="button"
          aria-expanded={sectionOpen}
          onClick={() => setSectionOpen((o) => !o)}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
            sectionOpen || manageActive
              ? "text-charcoal"
              : "text-charcoal hover:bg-beige"
          )}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted transition-transform",
              sectionOpen ? "rotate-0" : "-rotate-90"
            )}
          />
          <span className="truncate">📂 التصنيفات</span>
        </button>
        <Link
          href="/admin/categories"
          onClick={onNavigate}
          title="إدارة التصنيفات"
          aria-label="إدارة التصنيفات"
          className={cn(
            "me-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
            manageActive
              ? "bg-gold text-white"
              : "text-muted hover:bg-beige hover:text-charcoal"
          )}
        >
          <Settings2 className="h-4 w-4" />
        </Link>
      </div>

      {sectionOpen && (
        <div className="ms-1 space-y-1 border-r border-beige-dark/70 pe-1">
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
            <p className="px-3 py-2 text-xs text-muted">لا توجد تصنيفات ظاهرة</p>
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
  );
}

function AdminSidebarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const category = searchParams.get("category");
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
        {LINKS_BEFORE_CATEGORIES.map((link) => (
          <NavLink
            key={link.href}
            href={link.href}
            label={link.label}
            active={isLinkActive(
              link.href,
              pathname,
              category,
              "exact" in link ? link.exact : false
            )}
            onNavigate={closeMobile}
          />
        ))}

        <CategoriesNavSection
          pathname={pathname}
          categoryParam={category}
          onNavigate={closeMobile}
        />

        {LINKS_AFTER_CATEGORIES.map((link) => (
          <NavLink
            key={link.href}
            href={link.href}
            label={link.label}
            active={isLinkActive(link.href, pathname, category)}
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
