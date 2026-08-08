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
  ADMIN_INBOX_CHANGED_EVENT,
} from "@/lib/admin/inbox-events";
import { useAdminCapabilities } from "@/hooks/useAdminCapabilities";
import {
  adminCategoryProductsHref,
  buildAdminProductSidebarGroups,
  isAdminCategoryNavActive,
  type Category,
} from "@/types/category";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import type { Dictionary } from "@/lib/i18n";
import { resolveCategoryLabel } from "@/lib/i18n/category-labels";

type InboxCounts = {
  messages: number;
  bookings: number;
  orders: number;
  total: number;
};

type CategoryWithCount = Category & { product_count?: number };

type AdminDict = Dictionary["admin"];
type AdminLabelKey = {
  [K in keyof AdminDict]: AdminDict[K] extends string ? K : never;
}[keyof AdminDict];

/** Top-level modules — never hardcode product-category shortcuts here. */
const PRIMARY_LINK_DEFS = [
  { href: "/admin", labelKey: "dashboard" as const, exact: true },
] as const;

const MODULE_LINK_DEFS = [
  { href: "/admin/gallery", labelKey: "gallery" as const },
  { href: "/admin/bookings", labelKey: "bookings" as const },
  { href: "/admin/calendar", labelKey: "calendar" as const },
  {
    href: "/admin/appointments/settings",
    labelKey: "appointmentSettings" as const,
  },
  {
    href: "/admin/appointments/analytics",
    labelKey: "appointmentAnalytics" as const,
  },
  { href: "/admin/orders", labelKey: "orders" as const },
  { href: "/admin/customers", labelKey: "customers" as const },
  { href: "/admin/guests", labelKey: "guests" as const },
  { href: "/admin/shipping", labelKey: "shipping" as const },
  { href: "/admin/notifications", labelKey: "notifications" as const },
  { href: "/admin/payments", labelKey: "paymentsInvoicing" as const },
  { href: "/admin/messages", labelKey: "messages" as const },
  { href: "/admin/activity", labelKey: "activity" as const },
  { href: "/admin/trash", labelKey: "trash" as const },
  { href: "/admin/content/home", labelKey: "homeContent" as const },
  { href: "/admin/content/about", labelKey: "aboutContent" as const },
  { href: "/admin/reports", labelKey: "reports" as const },
  { href: "/admin/settings", labelKey: "storeSettings" as const },
  { href: "/admin/administrators", labelKey: "administrators" as const },
] as const;

const CUSTOM_DESIGN_LINK_DEFS = [
  {
    href: "/admin/bookings?service=custom_design",
    labelKey: "designRequests" as const,
  },
  {
    href: "/admin/calendar",
    labelKey: "appointments" as const,
  },
] as const;

const EXPERIENCE_ENGINE_LINK_DEFS = [
  { href: "/admin/experience", labelKey: "overview" as const, exact: true },
  { href: "/admin/experience/features", labelKey: "features" as const },
  { href: "/admin/experience/services", labelKey: "services" as const },
  {
    href: "/admin/experience/product-types",
    labelKey: "productTypes" as const,
  },
  {
    href: "/admin/experience/purchase-flows",
    labelKey: "purchaseFlows" as const,
  },
  { href: "/admin/experience/templates", labelKey: "templates" as const },
  { href: "/admin/experience/preview", labelKey: "preview" as const },
] as const;

function labelFromAdmin(
  dict: AdminDict,
  key: AdminLabelKey
): string {
  return dict[key];
}

function isLinkActive(
  href: string,
  pathname: string,
  category: string | null,
  collection: string | null,
  service: string | null,
  exact?: boolean
) {
  if (exact) return pathname === href;

  if (href.includes("?")) {
    const [path, query] = href.split("?");
    const params = new URLSearchParams(query);
    const hrefCategory = params.get("category");
    const hrefCollection = params.get("collection");
    const hrefService = params.get("service");
    if (pathname !== path) return false;
    if (hrefService) {
      return service === hrefService;
    }
    if (hrefCollection) {
      return collection === hrefCollection && !category;
    }
    if (hrefCategory) {
      return category === hrefCategory;
    }
    return !category && !collection && !service;
  }

  if (href === "/admin/dresses") {
    return pathname === "/admin/dresses" && !category && !collection;
  }

  if (href === "/admin/bookings") {
    return pathname === "/admin/bookings" && !service;
  }

  if (pathname.startsWith(href + "/") || pathname === href) {
    return true;
  }
  return false;
}

function NavLink({
  href,
  label,
  active,
  onNavigate,
  className,
  badge,
}: {
  href: string;
  label: ReactNode;
  active: boolean;
  onNavigate: () => void;
  className?: string;
  badge?: number;
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
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge != null && badge > 0 ? (
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
            active ? "bg-white/20 text-white" : "bg-gold/15 text-gold"
          )}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

function useAdminInboxCounts() {
  const [counts, setCounts] = useState<InboxCounts>({
    messages: 0,
    bookings: 0,
    orders: 0,
    total: 0,
  });

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/inbox-counts", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as Partial<InboxCounts>;
      setCounts({
        messages: Number(data.messages) || 0,
        bookings: Number(data.bookings) || 0,
        orders: Number(data.orders) || 0,
        total: Number(data.total) || 0,
      });
    } catch {
      /* keep previous */
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refetch();
    }, 0);
    const onFocus = () => {
      void refetch();
    };
    const onChanged = () => {
      void refetch();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener(ADMIN_INBOX_CHANGED_EVENT, onChanged);
    const interval = window.setInterval(() => {
      void refetch();
    }, 60_000);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(ADMIN_INBOX_CHANGED_EVENT, onChanged);
    };
  }, [refetch]);

  return counts;
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

  return { categories, loaded };
}

function ProductsNavSection({
  pathname,
  categoryParam,
  collectionParam,
  serviceParam,
  onNavigate,
}: {
  pathname: string;
  categoryParam: string | null;
  collectionParam: string | null;
  serviceParam: string | null;
  onNavigate: () => void;
}) {
  const { t, locale } = useLocale();
  const sb = t.admin.sidebarUi;
  const { categories, loaded } = useAdminSidebarCategories();

  const routeWantsProductsOpen =
    pathname.startsWith("/admin/dresses") ||
    pathname.startsWith("/admin/categories") ||
    pathname.startsWith("/admin/veils") ||
    pathname.startsWith("/admin/bridal-robes");
  const routeKey = `${pathname}|${categoryParam ?? ""}|${collectionParam ?? ""}`;
  const [sectionRouteKey, setSectionRouteKey] = useState(routeKey);
  const [productsOpen, setProductsOpen] = useState(routeWantsProductsOpen);

  if (sectionRouteKey !== routeKey) {
    setSectionRouteKey(routeKey);
    if (routeWantsProductsOpen) setProductsOpen(true);
  }

  const grouped = useMemo(() => {
    return buildAdminProductSidebarGroups(categories) as {
      rentalParent: CategoryWithCount | null;
      rentalChildren: CategoryWithCount[];
      accessoriesParent: CategoryWithCount | null;
      accessoriesChildren: CategoryWithCount[];
      rest: CategoryWithCount[];
    };
  }, [categories]);

  const rentalChildActive = grouped.rentalChildren.some((c) =>
    isAdminCategoryNavActive(c, pathname, categoryParam)
  );
  const [rentalOpen, setRentalOpen] = useState(true);
  const [rentalRouteKey, setRentalRouteKey] = useState(routeKey);
  if (rentalRouteKey !== routeKey) {
    setRentalRouteKey(routeKey);
    if (rentalChildActive) setRentalOpen(true);
  }

  const accessoriesChildActive = grouped.accessoriesChildren.some((c) =>
    isAdminCategoryNavActive(c, pathname, categoryParam)
  );
  const [accessoriesOpen, setAccessoriesOpen] = useState(true);
  const [accessoriesRouteKey, setAccessoriesRouteKey] = useState(routeKey);
  if (accessoriesRouteKey !== routeKey) {
    setAccessoriesRouteKey(routeKey);
    if (accessoriesChildActive) setAccessoriesOpen(true);
  }

  const allProductsActive = isLinkActive(
    "/admin/dresses",
    pathname,
    categoryParam,
    collectionParam,
    serviceParam
  );
  const manageActive = pathname.startsWith("/admin/categories");
  const collectionsActive =
    pathname === "/admin/dresses" && collectionParam === "1";

  const renderCategoryLink = (c: CategoryWithCount) => {
    const href = adminCategoryProductsHref(c);
    const active = isAdminCategoryNavActive(c, pathname, categoryParam);
    const count = c.product_count ?? 0;
    const label = (
      <>
        {resolveCategoryLabel(c, locale)}
        <span className={cn("ms-1", active ? "text-white/80" : "text-muted")}>
          ({count})
        </span>
      </>
    );

    // Accessories group has no single admin list — children (veils/robes) are the links.
    if (!href) {
      return (
        <span
          key={c.id}
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted"
        >
          {label}
        </span>
      );
    }

    return (
      <NavLink
        key={c.id}
        href={href}
        label={label}
        active={active}
        onNavigate={onNavigate}
        className="px-3 py-2 text-sm"
      />
    );
  };

  const hasAnyCategory =
    grouped.rentalChildren.length > 0 ||
    Boolean(grouped.rentalParent) ||
    grouped.accessoriesChildren.length > 0 ||
    Boolean(grouped.accessoriesParent) ||
    grouped.rest.length > 0;

  return (
    <div className="space-y-1">
      <SectionToggle
        label={t.admin.products}
        open={productsOpen}
        onToggle={() => setProductsOpen((o) => !o)}
        active={routeWantsProductsOpen}
        trailing={
          <Link
            href="/admin/categories"
            onClick={onNavigate}
            title={t.admin.manageCategories}
            aria-label={t.admin.manageCategories}
            className={cn(
              "me-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors",
              manageActive
                ? "bg-gold text-white"
                : "text-muted hover:bg-beige hover:text-charcoal"
            )}
          >
            <Settings2 className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {productsOpen && (
        <div className="ms-1 space-y-0.5 border-s border-beige-dark/70 pe-1">
          <NavLink
            href="/admin/dresses"
            label={t.admin.allProducts}
            active={allProductsActive}
            onNavigate={onNavigate}
            className="px-3 py-2 text-sm"
          />

          {!loaded && (
            <p className="px-3 py-2 text-xs text-muted">{t.common.loading}</p>
          )}

          {loaded && !hasAnyCategory && (
            <p className="px-3 py-2 text-xs text-muted">
              {sb.noVisibleCategories}
            </p>
          )}

          {(grouped.rentalParent || grouped.rentalChildren.length > 0) && (
            <div className="pt-1">
              <SectionToggle
                label={
                  grouped.rentalParent
                    ? resolveCategoryLabel(grouped.rentalParent, locale)
                    : sb.rentalFallback
                }
                open={rentalOpen}
                onToggle={() => setRentalOpen((o) => !o)}
                active={rentalChildActive}
              />
              {rentalOpen && (
                <div className="ms-1 space-y-0.5 border-r border-beige-dark/50 pe-1">
                  {grouped.rentalChildren.length === 0 ? (
                    <p className="px-3 py-1.5 text-[11px] text-muted">
                      {sb.addRentalChild}
                    </p>
                  ) : (
                    grouped.rentalChildren.map(renderCategoryLink)
                  )}
                </div>
              )}
            </div>
          )}

          {(grouped.accessoriesParent ||
            grouped.accessoriesChildren.length > 0) && (
            <div className="pt-1">
              <SectionToggle
                label={
                  grouped.accessoriesParent
                    ? resolveCategoryLabel(grouped.accessoriesParent, locale)
                    : sb.accessoriesFallback
                }
                open={accessoriesOpen}
                onToggle={() => setAccessoriesOpen((o) => !o)}
                active={accessoriesChildActive}
              />
              {accessoriesOpen && (
                <div className="ms-1 space-y-0.5 border-r border-beige-dark/50 pe-1">
                  {grouped.accessoriesChildren.length === 0 ? (
                    <p className="px-3 py-1.5 text-[11px] text-muted">
                      {sb.addAccessoriesChild}
                    </p>
                  ) : (
                    grouped.accessoriesChildren.map(renderCategoryLink)
                  )}
                </div>
              )}
            </div>
          )}

          {grouped.rest.map(renderCategoryLink)}

          <NavLink
            href="/admin/bookings?service=custom_design"
            label={t.admin.customDesign}
            active={
              pathname === "/admin/bookings" &&
              serviceParam === "custom_design"
            }
            onNavigate={onNavigate}
            className="px-3 py-2 text-sm"
          />

          <NavLink
            href="/admin/dresses?collection=1"
            label={t.admin.collections}
            active={collectionsActive}
            onNavigate={onNavigate}
            className="px-3 py-2 text-sm"
          />
        </div>
      )}
    </div>
  );
}

function ExperienceEngineNavSection({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate: () => void;
}) {
  const { t } = useLocale();
  const sectionActive = pathname.startsWith("/admin/experience");
  const [open, setOpen] = useState(sectionActive);
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    if (sectionActive) setOpen(true);
  }

  return (
    <div className="space-y-1">
      <SectionToggle
        label={t.admin.experienceEngine}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        active={sectionActive}
      />
      {open && (
        <div className="ms-1 space-y-0.5 border-s border-beige-dark/70 pe-1">
          {EXPERIENCE_ENGINE_LINK_DEFS.map((item) => {
            const active =
              "exact" in item && item.exact
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(item.href + "/");
            return (
              <NavLink
                key={item.href}
                href={item.href}
                label={labelFromAdmin(t.admin, item.labelKey)}
                active={active}
                onNavigate={onNavigate}
                className="px-3 py-2 text-sm"
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function CustomDesignNavSection({
  pathname,
  categoryParam,
  collectionParam,
  serviceParam,
  onNavigate,
}: {
  pathname: string;
  categoryParam: string | null;
  collectionParam: string | null;
  serviceParam: string | null;
  onNavigate: () => void;
}) {
  const { t } = useLocale();
  const designRequestsActive =
    pathname === "/admin/bookings" && serviceParam === "custom_design";
  const appointmentsActive = pathname.startsWith("/admin/calendar");
  const sectionActive = designRequestsActive;

  const [open, setOpen] = useState(designRequestsActive);
  const routeKey = `${pathname}|${serviceParam ?? ""}`;
  const [prevRouteKey, setPrevRouteKey] = useState(routeKey);
  if (prevRouteKey !== routeKey) {
    setPrevRouteKey(routeKey);
    if (designRequestsActive) setOpen(true);
  }

  return (
    <div className="space-y-1">
      <SectionToggle
        label={t.admin.customDesign}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        active={sectionActive}
      />

      {open && (
        <div className="ms-1 space-y-0.5 border-s border-beige-dark/70 pe-1">
          {CUSTOM_DESIGN_LINK_DEFS.map((item) => {
            const active =
              item.href === "/admin/calendar"
                ? appointmentsActive
                : isLinkActive(
                    item.href,
                    pathname,
                    categoryParam,
                    collectionParam,
                    serviceParam
                  );

            return (
              <NavLink
                key={item.href + item.labelKey}
                href={item.href}
                label={labelFromAdmin(t.admin, item.labelKey)}
                active={active}
                onNavigate={onNavigate}
                className="px-3 py-2 text-sm"
              />
            );
          })}
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
  const service = searchParams.get("service");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const inbox = useAdminInboxCounts();
  const { caps } = useAdminCapabilities();
  const { t } = useLocale();

  const moduleLinks = useMemo(
    () =>
      MODULE_LINK_DEFS.filter(
        (link) =>
          link.href !== "/admin/administrators" ||
          caps.canManageAdministrators
      ),
    [caps.canManageAdministrators]
  );

  const closeMobile = () => setOpen(false);

  const moduleBadge = (href: string): number | undefined => {
    if (href === "/admin/messages") return inbox.messages;
    if (href === "/admin/bookings") return inbox.bookings;
    if (href === "/admin/orders") return inbox.orders;
    return undefined;
  };

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
          <p className="mt-1 text-xs text-muted">{t.admin.panelSubtitle}</p>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {PRIMARY_LINK_DEFS.map((link) => (
          <NavLink
            key={link.href}
            href={link.href}
            label={labelFromAdmin(t.admin, link.labelKey)}
            active={isLinkActive(
              link.href,
              pathname,
              category,
              collection,
              service,
              "exact" in link ? link.exact : false
            )}
            onNavigate={closeMobile}
            badge={
              link.href === "/admin" && inbox.total > 0
                ? inbox.total
                : undefined
            }
          />
        ))}

        <ProductsNavSection
          pathname={pathname}
          categoryParam={category}
          collectionParam={collection}
          serviceParam={service}
          onNavigate={closeMobile}
        />

        <ExperienceEngineNavSection
          pathname={pathname}
          onNavigate={closeMobile}
        />

        <CustomDesignNavSection
          pathname={pathname}
          categoryParam={category}
          collectionParam={collection}
          serviceParam={service}
          onNavigate={closeMobile}
        />

        {moduleLinks.map((link) => (
          <NavLink
            key={link.href}
            href={link.href}
            label={labelFromAdmin(t.admin, link.labelKey)}
            active={isLinkActive(
              link.href,
              pathname,
              category,
              collection,
              service
            )}
            onNavigate={closeMobile}
            badge={moduleBadge(link.href)}
          />
        ))}
      </nav>

      <div className="space-y-1 border-t border-beige-dark p-4">
        <LanguageSwitcher variant="admin" />
        <p className="px-1 pb-2 text-[11px] leading-snug text-muted">
          {t.admin.languageHint}
        </p>
        <Link
          href="/"
          className="mb-2 block rounded-xl px-4 py-2 text-sm text-muted hover:bg-beige hover:text-charcoal"
          onClick={closeMobile}
        >
          {t.admin.viewSite}
        </Link>
        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {t.admin.logout}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 border-e border-beige-dark bg-white lg:block">
        {Nav}
      </aside>

      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-beige-dark bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t.admin.openMenu}
          className="rounded-lg p-2 hover:bg-beige"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-[family-name:var(--font-cormorant)] text-lg tracking-widest text-gold">
          {SITE_NAME}
        </span>
        <LanguageSwitcher variant="storefront" compact />
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-charcoal/40"
            aria-label={t.admin.close}
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 start-0 w-[min(288px,85vw)] bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 start-4 rounded-lg p-2 hover:bg-beige"
              aria-label={t.admin.close}
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
        <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 border-e border-beige-dark bg-white lg:block" />
      }
    >
      <AdminSidebarInner />
    </Suspense>
  );
}
