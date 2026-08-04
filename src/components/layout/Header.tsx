"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronDown, Menu, ShoppingBag, User, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { SITE_NAME } from "@/lib/constants";
import {
  type NavChild,
  type NavItem,
  type NavLink,
  capTopLevelNav,
} from "@/lib/categories/nav";
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
import { LuxuryNavPanel } from "@/components/layout/LuxuryNavPanel";
import { useCustomerAuth } from "@/components/auth/CustomerAuthProvider";

/** Last-resort offline fallback only — live nav is DB-driven via layout. */
const FALLBACK_ITEMS: NavItem[] = capTopLevelNav([
  ...DRESS_CATEGORIES.map(
    (c): NavItem => ({
      id: `fallback-${c}`,
      href: DRESS_CATEGORY_HREFS[c],
      label: DRESS_CATEGORY_LABELS[c],
      children: [] as NavChild[],
      kind: "category",
      description: null,
      coverImageUrl: null,
      featured: false,
    })
  ),
  {
    id: "fallback-accessories",
    href: ACCESSORIES_PARENT.children[0]?.href ?? "/veils",
    label: ACCESSORIES_PARENT.label,
    children: SHOP_NAV_LINKS.map(
      (link, i): NavChild => ({
        id: `fallback-acc-${i}`,
        href: link.href,
        label: link.label,
        description: null,
        coverImageUrl: null,
        featured: false,
      })
    ),
    kind: "category",
    description: null,
    coverImageUrl: null,
    featured: false,
  },
]);

/** Utility links kept as icons / CTA — not dumped into the category bar. */
const UTILITY_LINKS = [
  { href: "/booking", label: "احجزي موعدًا" },
  { href: "/cart", label: "السلة" },
] as const;

interface HeaderProps {
  items?: NavItem[];
}

function itemHasPanel(item: NavItem): boolean {
  return (
    item.children.length > 0 ||
    Boolean(item.overflowItems?.length) ||
    item.kind === "more"
  );
}

export function Header({ items = FALLBACK_ITEMS }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [mobileExpandedId, setMobileExpandedId] = useState<string | null>(null);
  const [panelVariant, setPanelVariant] = useState<"mega" | "compact">("mega");
  const { count } = useCart();
  const { customer, user, openLogin } = useCustomerAuth();
  const baseId = useId();

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

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const apply = () => setPanelVariant(mq.matches ? "mega" : "compact");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const closeDropdown = () => setOpenDropdownId(null);

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
        side navs so category links can never overlap the brand.
        Primary bar is capped (≤7) — overflow lives in المزيد, not a scroll row.
        Mobile: menu | centered logo | shrink-0 utilities (cart + notifications).
      */}
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 px-3 sm:gap-x-3 sm:px-4 md:px-8 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-x-6">
        <button
          type="button"
          className="shrink-0 justify-self-start lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="فتح القائمة"
        >
          <Menu className="h-6 w-6 text-charcoal" />
        </button>

        <nav
          className="hidden min-w-0 items-center justify-start gap-x-0.5 lg:flex xl:gap-x-1"
          aria-label="التنقل الرئيسي"
        >
          {items.map((item) => {
            const hasPanel = itemHasPanel(item);
            if (!hasPanel) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="shrink-0 whitespace-nowrap px-2 py-1.5 text-[12px] font-medium tracking-wide text-charcoal/80 transition-colors hover:text-gold xl:px-2.5 xl:text-[13px]"
                >
                  {item.label}
                </Link>
              );
            }

            const open = openDropdownId === item.id;
            const menuId = `${baseId}-${item.id}`;
            return (
              <div
                key={item.id}
                className="relative shrink-0"
                onMouseEnter={() => setOpenDropdownId(item.id)}
                onMouseLeave={() => setOpenDropdownId(null)}
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5 text-[12px] font-medium tracking-wide text-charcoal/80 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 xl:px-2.5 xl:text-[13px]"
                  aria-expanded={open}
                  aria-haspopup="menu"
                  aria-controls={menuId}
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
                  <span>{item.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-transform duration-300",
                      open && "rotate-180"
                    )}
                    aria-hidden
                  />
                </button>
                <LuxuryNavPanel
                  id={menuId}
                  item={item}
                  open={open}
                  variant={panelVariant}
                  onNavigate={closeDropdown}
                />
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

        <nav
          className="hidden min-w-0 items-center justify-end gap-x-3 overflow-hidden lg:flex xl:gap-x-4"
          aria-label="روابط سريعة"
        >
          <Link
            href="/booking"
            className="hidden whitespace-nowrap rounded-full border border-gold/40 px-3.5 py-1.5 text-xs font-medium tracking-wide text-gold transition-colors hover:bg-gold hover:text-white xl:inline-flex"
          >
            احجزي موعدًا
          </Link>
          {UTILITY_LINKS.filter((l) => l.href === "/cart").map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative text-sm font-medium text-charcoal/80 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2"
            >
              {link.label}
              {count > 0 && (
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
          className="fixed inset-0 z-[60] bg-ivory lg:hidden"
        >
          <div className="flex items-center justify-between border-b border-beige-dark/60 px-4 py-5">
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
          <nav
            className="flex max-h-[calc(100vh-5.5rem)] flex-col gap-0.5 overflow-y-auto px-5 py-5"
            aria-label="قائمة الجوال"
          >
            {items.map((item) => {
              const hasPanel = itemHasPanel(item);
              if (!hasPanel) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl px-4 py-3.5 text-lg font-medium text-charcoal transition-colors hover:bg-beige"
                  >
                    {item.label}
                  </Link>
                );
              }

              const expanded = mobileExpandedId === item.id;
              const panelId = `${baseId}-m-${item.id}`;
              const overflow = item.overflowItems;

              return (
                <div
                  key={item.id}
                  className="rounded-xl border-b border-beige-dark/40 last:border-0"
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-lg font-medium text-charcoal transition-colors hover:bg-beige"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() =>
                      setMobileExpandedId((id) =>
                        id === item.id ? null : item.id
                      )
                    }
                  >
                    <span>{item.label}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-gold transition-transform duration-300",
                        expanded && "rotate-180"
                      )}
                      aria-hidden
                    />
                  </button>
                  {expanded && (
                    <motion.div
                      id={panelId}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="overflow-hidden pb-3"
                    >
                      {overflow?.length ? (
                        <div className="ms-2 flex flex-col gap-1 border-s border-gold/25 ps-3">
                          {overflow.map((parent) => (
                            <MobileAccordionBranch
                              key={parent.id}
                              item={parent}
                              onNavigate={() => setMobileOpen(false)}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="ms-2 flex flex-col border-s border-gold/25 ps-3">
                          <Link
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className="rounded-xl px-4 py-2.5 text-base font-medium text-gold hover:bg-beige"
                          >
                            عرض الكل
                          </Link>
                          {item.children.map((link) => (
                            <MobileChildLink
                              key={link.id}
                              link={link}
                              onNavigate={() => setMobileOpen(false)}
                            />
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              );
            })}

            <div className="mt-4 border-t border-beige-dark/60 pt-3">
              <Link
                href="/booking"
                onClick={() => setMobileOpen(false)}
                className="mb-2 block rounded-xl bg-gold/10 px-4 py-3.5 text-center text-lg font-medium text-gold"
              >
                احجزي موعدًا
              </Link>
              <Link
                href="/cart"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-4 py-3 text-lg font-medium text-charcoal hover:bg-beige"
              >
                السلة{count > 0 ? ` (${count})` : ""}
              </Link>
              {customer || user ? (
                <Link
                  href="/account"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl px-4 py-3 text-lg font-medium text-charcoal hover:bg-beige"
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
                  className="w-full rounded-xl px-4 py-3 text-start text-lg font-medium text-charcoal hover:bg-beige"
                >
                  دخول
                </button>
              )}
            </div>
          </nav>
        </motion.div>
      )}
    </header>
  );
}

function MobileChildLink({
  link,
  onNavigate,
}: {
  link: NavLink & Partial<NavChild>;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      className="rounded-xl px-4 py-2.5 text-base font-medium text-charcoal/90 hover:bg-beige"
    >
      <span className="block">{link.label}</span>
      {"description" in link && link.description ? (
        <span className="mt-0.5 block text-xs font-normal text-muted line-clamp-2">
          {link.description}
        </span>
      ) : null}
    </Link>
  );
}

function MobileAccordionBranch({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (!item.children.length) {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className="rounded-xl px-4 py-2.5 text-base font-medium text-charcoal hover:bg-beige"
      >
        {item.label}
      </Link>
    );
  }
  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-base font-medium text-charcoal hover:bg-beige"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{item.label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-gold transition-transform",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      {open && (
        <div className="ms-2 flex flex-col border-s border-gold/20 ps-2">
          <Link
            href={item.href}
            onClick={onNavigate}
            className="rounded-xl px-4 py-2 text-sm font-medium text-gold hover:bg-beige"
          >
            عرض الكل
          </Link>
          {item.children.map((child) => (
            <MobileChildLink
              key={child.id}
              link={child}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
