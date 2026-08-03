"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "لوحة التحكم", exact: true },
  { href: "/admin/categories", label: "📂 التصنيفات" },
  { href: "/admin/dresses", label: "👰 الفساتين" },
  { href: "/admin/nouf-dresses", label: "👗 فساتين نوف" },
  { href: "/admin/veils", label: "🕊️ طرحة العروس" },
  { href: "/admin/bridal-robes", label: "🥻 برنس العروس" },
  { href: "/admin/gallery", label: "🖼️ المعرض" },
  { href: "/admin/bookings", label: "📅 الحجوزات" },
  { href: "/admin/orders", label: "🛒 الطلبات" },
  { href: "/admin/notifications", label: "🔔 الإشعارات" },
  { href: "/admin/messages", label: "💬 الرسائل" },
  { href: "/admin/settings", label: "⚙️ الإعدادات" },
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
    return (
      pathname === path && category === params.get("category")
    );
  }

  if (href === "/admin/dresses") {
    return pathname === "/admin/dresses" && !category;
  }

  if (href === "/admin/nouf-dresses") {
    return pathname === "/admin/nouf-dresses";
  }

  // Avoid /admin/dresses matching /admin/nouf-dresses via startsWith
  if (pathname.startsWith(href + "/") || pathname === href) {
    return true;
  }
  return false;
}

function AdminSidebarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const category = searchParams.get("category");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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
        <Link href="/admin" className="block" onClick={() => setOpen(false)}>
          <p className="font-[family-name:var(--font-cormorant)] text-xl font-semibold tracking-widest text-gold">
            {SITE_NAME}
          </p>
          <p className="mt-1 text-xs text-muted">لوحة الإدارة</p>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {LINKS.map((link) => {
          const active = isLinkActive(
            link.href,
            pathname,
            category,
            "exact" in link ? link.exact : false
          );
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                active
                  ? "bg-gold text-white shadow-sm shadow-gold/20"
                  : "text-charcoal hover:bg-beige"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-beige-dark p-4">
        <Link
          href="/"
          className="mb-2 block rounded-xl px-4 py-2 text-sm text-muted hover:bg-beige hover:text-charcoal"
          onClick={() => setOpen(false)}
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
    <Suspense fallback={<aside className="fixed inset-y-0 right-0 z-40 hidden w-64 border-l border-beige-dark bg-white lg:block" />}>
      <AdminSidebarInner />
    </Suspense>
  );
}
