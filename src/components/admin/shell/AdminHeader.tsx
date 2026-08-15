"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronRight,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { useAdminInboxCounts } from "@/hooks/useAdminInboxCounts";
import { useAdminCapabilities } from "@/hooks/useAdminCapabilities";
import { AdminSearch } from "@/components/admin/shell/AdminSearch";
import { useAdminShell } from "@/components/admin/shell/AdminShellProvider";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

function crumbsFromPath(pathname: string, labels: Record<string, string>) {
  const parts = pathname.split("/").filter(Boolean);
  const items: { href: string; label: string }[] = [];
  let href = "";
  for (const part of parts) {
    href += `/${part}`;
    if (part === "admin") {
      items.push({ href: "/admin", label: labels.dashboard });
      continue;
    }
    items.push({
      href,
      label: labels[part] || decodeURIComponent(part).replace(/-/g, " "),
    });
  }
  return items;
}

export function AdminHeader({ email }: { email?: string | null }) {
  const { t } = useLocale();
  const s = t.admin.shellUi;
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, toggleCollapsed, setMobileOpen } = useAdminShell();
  const inbox = useAdminInboxCounts();
  const { caps } = useAdminCapabilities();
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const notifyRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const crumbLabels: Record<string, string> = {
    dashboard: t.admin.dashboard,
    dresses: t.admin.products,
    categories: t.admin.manageCategories,
    veils: t.admin.products,
    "bridal-robes": t.admin.products,
    "nouf-dresses": t.admin.products,
    gallery: t.admin.gallery,
    bookings: t.admin.bookings,
    calendar: t.admin.calendar,
    appointments: t.admin.appointments,
    settings: t.admin.appointmentSettings,
    analytics: t.admin.appointmentAnalytics,
    orders: t.admin.orders,
    customers: t.admin.customers,
    guests: t.admin.guests,
    shipping: t.admin.shipping,
    notifications: t.admin.notifications,
    payments: t.admin.paymentsInvoicing,
    messages: t.admin.messages,
    activity: t.admin.activity,
    trash: t.admin.trash,
    content: t.admin.homeContent,
    home: t.admin.homeContent,
    "worn-by-you": t.admin.wornByYou,
    about: t.admin.aboutContent,
    reports: t.admin.reports,
    administrators: t.admin.administrators,
    experience: t.admin.experienceEngine,
    features: t.admin.features,
    services: t.admin.services,
    "product-types": t.admin.productTypes,
    "purchase-flows": t.admin.purchaseFlows,
    templates: t.admin.templates,
    preview: t.admin.preview,
  };

  const crumbs = crumbsFromPath(pathname, crumbLabels);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (!notifyRef.current?.contains(event.target as Node)) setNotifyOpen(false);
      if (!userRef.current?.contains(event.target as Node)) setUserOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

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

  return (
    <header className="sticky top-0 z-30 border-b border-[#e8e2d8] bg-white/95 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-6 lg:px-[4%] lg:py-4">
        <button
          type="button"
          className="rounded-lg p-2 text-charcoal hover:bg-[#f4f0e8] lg:hidden"
          aria-label={t.admin.openMenu}
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="hidden rounded-lg p-2 text-charcoal hover:bg-[#f4f0e8] lg:inline-flex"
          aria-label={collapsed ? s.expandSidebar : s.collapseSidebar}
          onClick={toggleCollapsed}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </button>

        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-[0.9375rem] md:flex">
          {crumbs.map((crumb, index) => (
            <span key={crumb.href} className="flex min-w-0 items-center gap-1">
              {index > 0 ? (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted rtl:rotate-180" />
              ) : null}
              <Link
                href={crumb.href}
                className={cn(
                  "truncate hover:text-charcoal",
                  index === crumbs.length - 1
                    ? "font-medium text-charcoal"
                    : "text-muted"
                )}
              >
                {crumb.label}
              </Link>
            </span>
          ))}
        </nav>

        <div className="ms-auto flex min-w-0 flex-1 items-center gap-2 sm:max-w-xl lg:max-w-2xl">
          <AdminSearch />
        </div>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <div ref={notifyRef} className="relative">
            <button
              type="button"
              aria-label={s.notifications}
              aria-expanded={notifyOpen}
              onClick={() => setNotifyOpen((v) => !v)}
              className="relative rounded-lg p-2 text-charcoal hover:bg-[#f4f0e8]"
            >
              <Bell className="h-5 w-5" />
              {inbox.total > 0 ? (
                <span className="absolute end-1 top-1 min-w-4 rounded-full bg-[#9b2c2c] px-1 text-[10px] font-semibold text-white">
                  {inbox.total > 99 ? "99+" : inbox.total}
                </span>
              ) : null}
            </button>
            {notifyOpen ? (
              <div className="absolute end-0 z-50 mt-2 w-72 rounded-2xl border border-[#e8e2d8] bg-white p-2 shadow-xl">
                <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  {s.notifications}
                </p>
                {inbox.total === 0 ? (
                  <p className="px-2 py-4 text-sm text-muted">{s.noInbox}</p>
                ) : (
                  <div className="space-y-1">
                    {inbox.orders > 0 ? (
                      <Link
                        href="/admin/orders"
                        className="flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-[#faf8f5]"
                        onClick={() => setNotifyOpen(false)}
                      >
                        <span>{t.admin.orders}</span>
                        <span className="tabular-nums text-muted">{inbox.orders}</span>
                      </Link>
                    ) : null}
                    {inbox.bookings > 0 ? (
                      <Link
                        href="/admin/bookings"
                        className="flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-[#faf8f5]"
                        onClick={() => setNotifyOpen(false)}
                      >
                        <span>{t.admin.bookings}</span>
                        <span className="tabular-nums text-muted">{inbox.bookings}</span>
                      </Link>
                    ) : null}
                    {inbox.messages > 0 ? (
                      <Link
                        href="/admin/messages"
                        className="flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-[#faf8f5]"
                        onClick={() => setNotifyOpen(false)}
                      >
                        <span>{t.admin.messages}</span>
                        <span className="tabular-nums text-muted">{inbox.messages}</span>
                      </Link>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <LanguageSwitcher variant="admin" compact className="hidden sm:block" />

          <div ref={userRef} className="relative">
            <button
              type="button"
              aria-expanded={userOpen}
              aria-label={email || SITE_NAME}
              onClick={() => setUserOpen((v) => !v)}
              className="rounded-lg p-2 text-charcoal hover:bg-[#f4f0e8]"
            >
              <UserRound className="h-5 w-5" />
            </button>
            {userOpen ? (
              <div className="absolute end-0 z-50 mt-2 w-64 rounded-2xl border border-[#e8e2d8] bg-white p-2 shadow-xl">
                <p className="truncate px-3 py-2 text-xs text-muted">{email || SITE_NAME}</p>
                <p className="px-3 pb-2 text-[11px] uppercase tracking-[0.14em] text-muted">
                  {caps.role}
                </p>
                <Link
                  href="/"
                  className="block rounded-xl px-3 py-2 text-sm hover:bg-[#faf8f5]"
                  onClick={() => setUserOpen(false)}
                >
                  {t.admin.viewSite}
                </Link>
                <button
                  type="button"
                  onClick={() => void logout()}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" />
                  {t.admin.logout}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
