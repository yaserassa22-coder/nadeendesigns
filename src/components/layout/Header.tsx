"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { useWishlist } from "@/components/shop/WishlistProvider";
import { NotificationCenter } from "@/components/layout/NotificationCenter";
import { useCustomerAuth } from "@/components/auth/CustomerAuthProvider";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

/** Last-resort offline fallback only — live nav is DB-driven via layout. */
const FALLBACK_ITEMS: NavItem[] = capTopLevelNav([
  ...DRESS_CATEGORIES.filter((c) => c !== "rental" && c !== "custom_design").map(
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

interface HeaderProps {
  items?: NavItem[];
  storeName?: string;
  logoUrl?: string;
}

function itemHasPanel(item: NavItem): boolean {
  return (
    item.children.length > 0 ||
    Boolean(item.overflowItems?.length) ||
    item.kind === "more"
  );
}

type SearchHit = { href: string; label: string; parent?: string };

function collectSearchHits(items: NavItem[]): SearchHit[] {
  const hits: SearchHit[] = [];
  for (const item of items) {
    hits.push({ href: item.href, label: item.label });
    for (const child of item.children) {
      hits.push({ href: child.href, label: child.label, parent: item.label });
    }
    for (const overflow of item.overflowItems ?? []) {
      hits.push({ href: overflow.href, label: overflow.label });
      for (const child of overflow.children) {
        hits.push({
          href: child.href,
          label: child.label,
          parent: overflow.label,
        });
      }
    }
  }
  return hits;
}

/**
 * Clean luxury header — centered wordmark, quiet utilities, MENU on the physical right.
 * MENU opens a right-edge sidebar drawer (not a full-page takeover).
 */
export function Header({
  items = FALLBACK_ITEMS,
  storeName = SITE_NAME,
  logoUrl,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const { count } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { customer, user, openLogin } = useCustomerAuth();
  const { t, dir } = useLocale();
  const baseId = useId();
  const searchHits = useMemo(() => collectSearchHits(items), [items]);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const contentDir = dir;

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setExpandedId(null);
  }, []);

  const openMenu = useCallback(() => {
    setMenuOpen(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen || searchOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen, searchOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen, closeMenu]);

  const utilities = (
    <>
      <LanguageSwitcher variant="storefront" compact />
      <UtilityIconButton
        label={t.nav.search}
        onClick={() => setSearchOpen(true)}
      >
        <Search className="h-[1.05rem] w-[1.05rem]" strokeWidth={1.5} />
      </UtilityIconButton>
      <UtilityLink
        href="/wishlist"
        label={t.nav.wishlist}
        badge={wishlistCount > 0 ? wishlistCount : undefined}
      >
        <Heart className="h-[1.05rem] w-[1.05rem]" strokeWidth={1.5} />
      </UtilityLink>
      {customer || user ? (
        <UtilityLink href="/account" label={t.nav.account}>
          <User className="h-[1.05rem] w-[1.05rem]" strokeWidth={1.5} />
        </UtilityLink>
      ) : (
        <UtilityIconButton label={t.nav.login} onClick={() => openLogin()}>
          <User className="h-[1.05rem] w-[1.05rem]" strokeWidth={1.5} />
        </UtilityIconButton>
      )}
      <NotificationCenter />
      <UtilityLink
        href="/cart"
        label={t.nav.cart}
        badge={count > 0 ? count : undefined}
      >
        <ShoppingBag className="h-[1.05rem] w-[1.05rem]" strokeWidth={1.5} />
      </UtilityLink>
    </>
  );

  return (
    <header
      data-storefront-chrome
      className="fixed top-0 z-50 w-full border-b border-beige-dark/70 bg-ivory"
    >
      {/*
        Physical LTR shell: wordmark stays centered in RTL and LTR.
        MENU is always on the physical right — language never moves it.
        [ utilities ] | [ logo ] | [ MENU ]
      */}
      <div
        dir="ltr"
        className="mx-auto grid max-w-[96rem] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3 px-4 py-3.5 sm:gap-x-6 sm:px-6 sm:py-4 md:px-8 lg:px-10"
      >
        <div
          dir={contentDir}
          className="flex min-w-0 flex-wrap items-center justify-self-start gap-x-0.5 sm:gap-x-1"
        >
          {utilities}
        </div>

        <BrandLogo name={storeName} logoUrl={logoUrl} />

        <div className="justify-self-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-sm px-1.5 py-1.5 text-charcoal transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
            aria-label={t.nav.openMenu}
            aria-expanded={menuOpen}
            aria-controls={`${baseId}-menu`}
            onClick={() => openMenu()}
          >
            <span className="hidden text-[11px] font-medium tracking-[0.22em] uppercase sm:inline">
              {t.nav.menuLabel}
            </span>
            <Menu className="h-5 w-5 sm:h-[1.15rem] sm:w-[1.15rem]" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {searchOpen ? (
          <SearchDialog onClose={closeSearch} hits={searchHits} />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {menuOpen ? (
          <div className="fixed inset-0 z-[60]" role="presentation">
            <motion.button
              type="button"
              aria-label={t.nav.closeMenu}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-charcoal/35 backdrop-blur-[2px]"
              onClick={closeMenu}
            />

            <motion.aside
              id={`${baseId}-menu`}
              role="dialog"
              aria-modal="true"
              aria-label={t.nav.mainAria}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 right-0 flex w-[min(100vw,22.5rem)] flex-col border-s border-beige-dark/70 bg-ivory shadow-[-12px_0_40px_rgba(0,0,0,0.08)] sm:w-[min(100vw,26rem)]"
            >
              <div
                dir="ltr"
                className="flex shrink-0 items-center justify-between gap-3 border-b border-beige-dark/70 px-5 py-4"
              >
                <p className="font-[family-name:var(--font-cormorant)] text-lg tracking-[0.14em] text-charcoal uppercase">
                  {t.nav.menuLabel}
                </p>
                <button
                  type="button"
                  onClick={closeMenu}
                  aria-label={t.nav.closeMenu}
                  className="inline-flex items-center gap-2 rounded-sm px-1.5 py-1.5 text-charcoal transition-colors hover:text-gold"
                >
                  <X className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </div>

              <nav
                dir={contentDir}
                className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4 sm:px-4"
                aria-label={t.nav.mainAria}
              >
                {items.map((item) => {
                  const hasPanel = itemHasPanel(item);
                  if (!hasPanel) {
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={closeMenu}
                        className="rounded-sm px-3 py-3 font-[family-name:var(--font-cormorant)] text-xl tracking-[0.06em] text-charcoal transition-colors hover:bg-beige/60 hover:text-gold"
                      >
                        {item.label}
                      </Link>
                    );
                  }

                  const expanded = expandedId === item.id;
                  const panelId = `${baseId}-side-${item.id}`;
                  const overflow = item.overflowItems;

                  return (
                    <div
                      key={item.id}
                      className="border-b border-beige-dark/40 last:border-0"
                    >
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-sm px-3 py-3 text-start font-[family-name:var(--font-cormorant)] text-xl tracking-[0.06em] text-charcoal transition-colors hover:bg-beige/60 hover:text-gold"
                        aria-expanded={expanded}
                        aria-controls={panelId}
                        onClick={() =>
                          setExpandedId((id) =>
                            id === item.id ? null : item.id
                          )
                        }
                      >
                        <span>{item.label}</span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-gold transition-transform duration-300",
                            expanded && "rotate-180"
                          )}
                          aria-hidden
                        />
                      </button>
                      {expanded ? (
                        <motion.div
                          id={panelId}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="overflow-hidden pb-2"
                        >
                          {overflow?.length ? (
                            <div className="ms-2 flex flex-col gap-1 border-s border-gold/25 ps-3">
                              {overflow.map((parent) => (
                                <MobileAccordionBranch
                                  key={parent.id}
                                  item={parent}
                                  onNavigate={closeMenu}
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="ms-2 flex flex-col border-s border-gold/25 ps-3">
                              <Link
                                href={item.href}
                                onClick={closeMenu}
                                className="rounded-sm px-3 py-2.5 text-sm font-medium tracking-wide text-gold hover:bg-beige/60"
                              >
                                {t.nav.viewAll}
                              </Link>
                              {item.children.map((link) => (
                                <MobileChildLink
                                  key={link.id}
                                  link={link}
                                  onNavigate={closeMenu}
                                />
                              ))}
                            </div>
                          )}
                        </motion.div>
                      ) : null}
                    </div>
                  );
                })}

                <div className="mt-5 space-y-1 border-t border-beige-dark/60 pt-4">
                  <div className="mb-3 px-1">
                    <LanguageSwitcher variant="storefront" compact={false} />
                  </div>
                  <Link
                    href="/booking"
                    onClick={closeMenu}
                    className="mb-1 block rounded-sm bg-gold/10 px-3 py-3 text-center text-sm font-medium tracking-[0.14em] text-gold uppercase"
                  >
                    {t.nav.bookAppointment}
                  </Link>
                  <Link
                    href="/wishlist"
                    onClick={closeMenu}
                    className="block rounded-sm px-3 py-2.5 text-sm text-charcoal/85 hover:bg-beige/60 hover:text-gold"
                  >
                    {t.nav.wishlist}
                    {wishlistCount > 0 ? ` (${wishlistCount})` : ""}
                  </Link>
                  <Link
                    href="/cart"
                    onClick={closeMenu}
                    className="block rounded-sm px-3 py-2.5 text-sm text-charcoal/85 hover:bg-beige/60 hover:text-gold"
                  >
                    {t.nav.cart}
                    {count > 0 ? ` (${count})` : ""}
                  </Link>
                  {customer || user ? (
                    <Link
                      href="/account"
                      onClick={closeMenu}
                      className="block rounded-sm px-3 py-2.5 text-sm text-charcoal/85 hover:bg-beige/60 hover:text-gold"
                    >
                      {t.nav.account}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        closeMenu();
                        window.setTimeout(() => openLogin(), 0);
                      }}
                      className="w-full rounded-sm px-3 py-2.5 text-start text-sm text-charcoal/85 hover:bg-beige/60 hover:text-gold"
                    >
                      {t.nav.login}
                    </button>
                  )}
                </div>
              </nav>
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

function BrandLogo({
  className,
  name = SITE_NAME,
  logoUrl,
}: {
  className?: string;
  name?: string;
  logoUrl?: string;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "group flex shrink-0 flex-col items-center px-2",
        className
      )}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={name}
          className="h-9 object-contain sm:h-10 md:h-11"
        />
      ) : (
        <span className="text-center font-[family-name:var(--font-cormorant)] text-xl font-semibold tracking-[0.22em] text-charcoal transition-colors group-hover:text-gold sm:text-2xl md:text-[1.75rem]">
          {name}
        </span>
      )}
    </Link>
  );
}

function UtilityIconButton({
  label,
  onClick,
  children,
  className,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "rounded-full p-2 text-charcoal/75 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:ring-offset-2",
        className
      )}
    >
      {children}
    </button>
  );
}

function UtilityLink({
  href,
  label,
  children,
  badge,
  className,
}: {
  href: string;
  label: string;
  children: ReactNode;
  badge?: number;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "relative rounded-full p-2 text-charcoal/75 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:ring-offset-2",
        className
      )}
    >
      {children}
      {badge != null && badge > 0 ? (
        <span className="absolute top-0 end-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

function SearchDialog({
  onClose,
  hits,
}: {
  onClose: () => void;
  hits: SearchHit[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { t, dir } = useLocale();

  useEffect(() => {
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return hits.slice(0, 8);
    return hits
      .filter(
        (h) =>
          h.label.toLowerCase().includes(q) ||
          h.parent?.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [hits, query]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const first = filtered[0];
    if (!first) return;
    onClose();
    router.push(first.href);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-start justify-center bg-charcoal/35 px-4 pt-[18vh] backdrop-blur-[2px]"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={t.nav.search}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-beige-dark/80 bg-ivory shadow-[0_24px_60px_-28px_rgba(44,36,25,0.45)]"
        onClick={(e) => e.stopPropagation()}
        dir={dir}
      >
        <form
          onSubmit={onSubmit}
          className="flex items-center gap-3 border-b border-beige-dark/60 px-4 py-3.5"
        >
          <Search
            className="h-5 w-5 shrink-0 text-gold"
            strokeWidth={1.5}
            aria-hidden
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.nav.searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-base text-charcoal outline-none placeholder:text-muted/70"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="rounded-full p-1.5 text-muted transition-colors hover:text-charcoal"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </form>
        <ul className="max-h-72 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <li className="px-5 py-6 text-center text-sm text-muted">
              {t.nav.noResults}
            </li>
          ) : (
            filtered.map((hit) => (
              <li key={`${hit.href}-${hit.label}`}>
                <Link
                  href={hit.href}
                  onClick={onClose}
                  className="flex flex-col px-5 py-2.5 transition-colors hover:bg-beige/70"
                >
                  <span className="text-sm font-medium text-charcoal">
                    {hit.label}
                  </span>
                  {hit.parent ? (
                    <span className="mt-0.5 text-xs text-muted">
                      {hit.parent}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))
          )}
        </ul>
      </motion.div>
    </motion.div>
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
  const { t } = useLocale();
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
            {t.nav.viewAll}
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
