"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronDown, Menu, ShoppingBag, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SITE_NAME } from "@/lib/constants";
import type { NavItem, NavLink } from "@/lib/categories/nav";
import {
  ACCESSORIES_PARENT,
  DRESS_CATEGORIES,
  DRESS_CATEGORY_HREFS,
  DRESS_CATEGORY_LABELS,
  SHOP_NAV_LINKS,
} from "@/types";
import { cn } from "@/lib/utils";
import { useCart } from "@/components/shop/CartProvider";
import { NotificationCenter } from "@/components/layout/NotificationCenter";
import { useCustomerAuth } from "@/components/auth/CustomerAuthProvider";

/** Last-resort offline fallback only — live nav is DB-driven via layout. */
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

const UTILITY_LINKS = [
  { href: "/cart", label: "السلة" },
  { href: "/gallery", label: "معرض الصور" },
  { href: "/booking", label: "احجزي موعدًا" },
  { href: "/about", label: "من نحن" },
  { href: "/contact", label: "اتصل بنا" },
] as const;

interface HeaderProps {
  items?: NavItem[];
}

export function Header({ items = FALLBACK_ITEMS }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [mobileExpandedId, setMobileExpandedId] = useState<string | null>(null);
  const { count } = useCart();
  const { customer, user, openLogin } = useCustomerAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!openDropdownId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenDropdownId(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openDropdownId]);

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-500",
        scrolled
          ? "border-b border-beige-dark bg-white/95 py-3 shadow-sm backdrop-blur-md"
          : "bg-transparent py-5"
      )}
    >
      {/*
        Desktop (≥lg): 3-column grid keeps the logo truly centered and isolates
        side navs so category links can never overlap the brand (1024/1440).
        Category zone scrolls horizontally — unlimited roots without cramming.
        Mobile: menu | centered logo | shrink-0 utilities (cart + notifications).
      */}
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 px-3 sm:gap-x-3 sm:px-4 md:px-8 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-x-4">
        <button
          type="button"
          className="shrink-0 justify-self-start lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="فتح القائمة"
        >
          <Menu className="h-6 w-6 text-charcoal" />
        </button>

        <nav
          className="hidden min-w-0 items-center justify-start gap-x-1 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] lg:flex xl:gap-x-2 [&::-webkit-scrollbar]:hidden"
          aria-label="تصنيفات المتجر"
        >
          {items.map((item) => {
            const hasChildren = item.children.length > 0;
            if (!hasChildren) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="shrink-0 whitespace-nowrap px-1.5 text-[12px] font-medium text-charcoal/80 transition-colors hover:text-gold xl:px-2 xl:text-sm"
                  title={item.label}
                >
                  {item.label}
                </Link>
              );
            }

            const open = openDropdownId === item.id;
            return (
              <div
                key={item.id}
                className="relative shrink-0"
                onMouseEnter={() => setOpenDropdownId(item.id)}
                onMouseLeave={() => setOpenDropdownId(null)}
              >
                <button
                  type="button"
                  className="inline-flex max-w-[11rem] items-center gap-1 truncate rounded-md px-1.5 text-[12px] font-medium text-charcoal/80 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 xl:max-w-[14rem] xl:px-2 xl:text-sm"
                  aria-expanded={open}
                  aria-haspopup="true"
                  title={item.label}
                  onClick={() =>
                    setOpenDropdownId((id) => (id === item.id ? null : item.id))
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key === "ArrowDown" ||
                      e.key === "Enter" ||
                      e.key === " "
                    ) {
                      e.preventDefault();
                      setOpenDropdownId(item.id);
                    }
                  }}
                >
                  <span className="truncate">{item.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-transform",
                      open && "rotate-180"
                    )}
                  />
                </button>
                {open && (
                  <div
                    role="menu"
                    className="absolute top-full start-0 z-50 mt-1 max-h-[70vh] min-w-[180px] overflow-y-auto rounded-xl border border-beige-dark bg-white py-2 shadow-lg"
                  >
                    <Link
                      href={item.href}
                      role="menuitem"
                      className="block border-b border-beige-dark/50 px-4 py-2.5 text-sm font-medium text-gold hover:bg-beige focus-visible:bg-beige focus-visible:outline-none"
                      onClick={() => setOpenDropdownId(null)}
                    >
                      عرض الكل
                    </Link>
                    {item.children.map((link) => (
                      <Link
                        key={`${item.id}-${link.href}`}
                        href={link.href}
                        role="menuitem"
                        className="block px-4 py-2.5 text-sm text-charcoal hover:bg-beige hover:text-gold focus-visible:bg-beige focus-visible:outline-none"
                        onClick={() => setOpenDropdownId(null)}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <Link
          href="/"
          className="group col-start-2 flex min-w-0 flex-col items-center justify-self-center px-1 sm:px-2 lg:col-start-auto"
        >
          <span className="max-w-[9.5rem] truncate text-center font-[family-name:var(--font-cormorant)] text-xl font-semibold tracking-widest text-charcoal transition-colors group-hover:text-gold sm:max-w-none sm:text-2xl md:text-3xl">
            {SITE_NAME}
          </span>
          <span className="mt-0.5 h-px w-0 bg-gold transition-all duration-500 group-hover:w-full" />
        </Link>

        <nav className="hidden min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-2 overflow-hidden lg:flex xl:gap-x-4">
          {UTILITY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative text-sm font-medium text-charcoal/80 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2"
            >
              {link.label}
              {link.href === "/cart" && count > 0 && (
                <span className="absolute -top-2 start-full ms-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] text-white">
                  {count}
                </span>
              )}
            </Link>
          ))}
          {customer || user ? (
            <Link
              href="/account"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-charcoal/80 transition-colors hover:text-gold"
            >
              <User className="h-4 w-4" />
              حسابي
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openLogin()}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-charcoal/80 transition-colors hover:text-gold"
            >
              <User className="h-4 w-4" />
              دخول
            </button>
          )}
          <NotificationCenter />
        </nav>

        {/* Mobile utilities: shrink-0 cluster — cart + notifications always in-flow */}
        <div className="col-start-3 flex shrink-0 items-center justify-self-end gap-0.5 sm:gap-1 lg:hidden">
          {customer || user ? (
            <Link
              href="/account"
              className="rounded-full p-1.5 text-charcoal hover:text-gold sm:p-2"
              aria-label="حسابي"
            >
              <User className="h-5 w-5" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openLogin()}
              className="rounded-full p-1.5 text-charcoal hover:text-gold sm:p-2"
              aria-label="دخول"
            >
              <User className="h-5 w-5" />
            </button>
          )}
          <NotificationCenter />
          <Link
            href="/cart"
            className="relative rounded-full p-1.5 text-charcoal hover:text-gold sm:p-2"
            aria-label="السلة"
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute top-0 end-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] text-white">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[60] bg-[#faf8f5] lg:hidden"
          style={{ backgroundColor: "#faf8f5" }}
        >
          <div className="flex items-center justify-between px-4 py-5">
            <span className="font-[family-name:var(--font-cormorant)] text-2xl tracking-widest text-gold">
              {SITE_NAME}
            </span>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="إغلاق"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex max-h-[calc(100vh-5.5rem)] flex-col gap-1 overflow-y-auto px-6 py-4">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl px-4 py-3 text-lg font-medium text-charcoal hover:bg-beige"
            >
              الرئيسية
            </Link>
            {items.map((item) => {
              const hasChildren = item.children.length > 0;
              if (!hasChildren) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl px-4 py-3 text-lg font-medium text-charcoal hover:bg-beige"
                  >
                    {item.label}
                  </Link>
                );
              }

              const expanded = mobileExpandedId === item.id;
              return (
                <div key={item.id} className="rounded-xl">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-lg font-medium text-charcoal hover:bg-beige"
                    aria-expanded={expanded}
                    onClick={() =>
                      setMobileExpandedId((id) =>
                        id === item.id ? null : item.id
                      )
                    }
                  >
                    <span>{item.label}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-gold transition-transform",
                        expanded && "rotate-180"
                      )}
                    />
                  </button>
                  {expanded && (
                    <div className="ms-3 flex flex-col border-s border-gold/30 ps-3">
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className="rounded-xl px-4 py-2.5 text-base font-medium text-gold hover:bg-beige"
                      >
                        عرض الكل
                      </Link>
                      {item.children.map((link) => (
                        <Link
                          key={`${item.id}-m-${link.href}`}
                          href={link.href}
                          onClick={() => setMobileOpen(false)}
                          className="rounded-xl px-4 py-2.5 text-base font-medium text-charcoal/90 hover:bg-beige"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {UTILITY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-4 py-3 text-lg font-medium text-charcoal hover:bg-beige"
              >
                {link.label}
                {link.href === "/cart" && count > 0 ? ` (${count})` : ""}
              </Link>
            ))}
            {customer || user ? (
              <Link
                href="/account"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-4 py-3 text-lg font-medium text-charcoal hover:bg-beige"
              >
                حسابي
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  openLogin();
                }}
                className="rounded-xl px-4 py-3 text-start text-lg font-medium text-charcoal hover:bg-beige"
              >
                دخول
              </button>
            )}
          </nav>
        </motion.div>
      )}
    </header>
  );
}
