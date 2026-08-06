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
import { LuxuryNavPanel } from "@/components/layout/LuxuryNavPanel";
import { useCustomerAuth } from "@/components/auth/CustomerAuthProvider";

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

export function Header({
  items = FALLBACK_ITEMS,
  storeName = SITE_NAME,
  logoUrl,
}: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [mobileExpandedId, setMobileExpandedId] = useState<string | null>(null);
  const [panelVariant, setPanelVariant] = useState<"mega" | "compact">("mega");
  const [searchOpen, setSearchOpen] = useState(false);
  const { count } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { customer, user, openLogin } = useCustomerAuth();
  const baseId = useId();
  const searchHits = useMemo(() => collectSearchHits(items), [items]);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen || searchOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen, searchOpen]);

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
        "fixed top-0 z-50 w-full transition-[background-color,box-shadow,padding,backdrop-filter] duration-500 ease-out",
        scrolled
          ? "border-b border-beige-dark/80 bg-ivory/95 py-2.5 shadow-[0_1px_0_rgba(201,169,110,0.18)] backdrop-blur-md md:py-3"
          : "bg-gradient-to-b from-ivory/90 via-ivory/55 to-transparent py-4 md:py-6"
      )}
    >
      {/*
        Desktop / tablet (≥lg): physical 3-column grid (dir=ltr shell) so the
        logo stays dead-center regardless of RTL document direction.
          [ utilities ] | [ logo ] | [ primary nav ]
        Inner clusters keep dir=rtl for Arabic reading order.
        Mobile: hamburger | centered logo | utility icons — separate composition.
      */}
      <div
        dir="ltr"
        className="mx-auto hidden max-w-[90rem] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-6 px-6 lg:grid xl:gap-x-10 xl:px-10 2xl:gap-x-14"
      >
        {/* Column 1 — utilities (physical start / left) */}
        <div
          dir="rtl"
          className="flex min-w-0 items-center justify-self-start gap-x-3 xl:gap-x-5"
        >
          <UtilityIconButton
            label="بحث"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.5} />
          </UtilityIconButton>

          <UtilityLink
            href="/wishlist"
            label="قائمة الأمنيات"
            badge={wishlistCount > 0 ? wishlistCount : undefined}
          >
            <Heart className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.5} />
          </UtilityLink>

          {customer || user ? (
            <UtilityLink href="/account" label="حسابي">
              <User className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.5} />
            </UtilityLink>
          ) : (
            <UtilityIconButton label="دخول" onClick={() => openLogin()}>
              <User className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.5} />
            </UtilityIconButton>
          )}

          <UtilityLink href="/cart" label="السلة" badge={count > 0 ? count : undefined}>
            <ShoppingBag className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.5} />
          </UtilityLink>

          <NotificationCenter className="hidden xl:block" />

          <Link
            href="/booking"
            className="ms-1 hidden whitespace-nowrap border-b border-gold/50 pb-0.5 text-[11px] font-medium tracking-[0.14em] text-gold transition-colors hover:border-gold hover:text-gold-dark xl:inline"
          >
            احجزي موعدًا
          </Link>
        </div>

        {/* Column 2 — logo (never shrinks, never overlapped) */}
        <BrandLogo scrolled={scrolled} name={storeName} logoUrl={logoUrl} />

        {/* Column 3 — primary nav (physical end / right) */}
        <nav
          dir="rtl"
          className="flex min-w-0 flex-wrap items-center justify-self-end gap-x-0.5 xl:gap-x-1"
          aria-label="التنقل الرئيسي"
        >
          {items.map((item) => (
            <DesktopNavItem
              key={item.id}
              item={item}
              baseId={baseId}
              open={openDropdownId === item.id}
              panelVariant={panelVariant}
              onOpen={() => setOpenDropdownId(item.id)}
              onToggle={() =>
                setOpenDropdownId((id) => (id === item.id ? null : item.id))
              }
              onClose={closeDropdown}
            />
          ))}
        </nav>
      </div>

      {/* Mobile / small tablet bar */}
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 px-4 sm:px-6 lg:hidden">
        <button
          type="button"
          className="justify-self-start rounded-full p-1.5 text-charcoal transition-colors hover:text-gold"
          onClick={() => setMobileOpen(true)}
          aria-label="فتح القائمة"
        >
          <Menu className="h-6 w-6" strokeWidth={1.5} />
        </button>

        <BrandLogo
          scrolled={scrolled}
          name={storeName}
          logoUrl={logoUrl}
          className="justify-self-center"
        />

        <div className="flex shrink-0 items-center justify-self-end gap-0.5 sm:gap-1">
          <UtilityIconButton
            label="بحث"
            onClick={() => setSearchOpen(true)}
            className="p-1.5 sm:p-2"
          >
            <Search className="h-5 w-5" strokeWidth={1.5} />
          </UtilityIconButton>
          <UtilityLink
            href="/wishlist"
            label="قائمة الأمنيات"
            badge={wishlistCount > 0 ? wishlistCount : undefined}
            className="p-1.5 sm:p-2"
          >
            <Heart className="h-5 w-5" strokeWidth={1.5} />
          </UtilityLink>
          {customer || user ? (
            <UtilityLink href="/account" label="حسابي" className="p-1.5 sm:p-2">
              <User className="h-5 w-5" strokeWidth={1.5} />
            </UtilityLink>
          ) : (
            <UtilityIconButton
              label="دخول"
              onClick={() => openLogin()}
              className="p-1.5 sm:p-2"
            >
              <User className="h-5 w-5" strokeWidth={1.5} />
            </UtilityIconButton>
          )}
          <NotificationCenter />
          <UtilityLink
            href="/cart"
            label="السلة"
            badge={count > 0 ? count : undefined}
            className="p-1.5 sm:p-2"
          >
            <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
          </UtilityLink>
        </div>
      </div>

      <AnimatePresence>
        {searchOpen ? (
          <SearchDialog onClose={closeSearch} hits={searchHits} />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] bg-ivory lg:hidden"
          >
            <div className="flex items-center justify-between border-b border-beige-dark/60 px-4 py-5">
              <span className="font-[family-name:var(--font-cormorant)] text-2xl tracking-[0.2em] text-gold">
                {storeName}
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="إغلاق"
                className="rounded-full p-1.5 text-charcoal transition-colors hover:text-gold"
              >
                <X className="h-6 w-6" strokeWidth={1.5} />
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
                      className="rounded-xl px-4 py-3.5 text-lg font-medium tracking-wide text-charcoal transition-colors hover:bg-beige"
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
                      className="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-lg font-medium tracking-wide text-charcoal transition-colors hover:bg-beige"
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

              <div className="mt-4 space-y-1 border-t border-beige-dark/60 pt-3">
                <Link
                  href="/booking"
                  onClick={() => setMobileOpen(false)}
                  className="mb-2 block rounded-xl bg-gold/10 px-4 py-3.5 text-center text-lg font-medium tracking-wide text-gold"
                >
                  احجزي موعدًا
                </Link>
                <Link
                  href="/wishlist"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl px-4 py-3 text-lg font-medium text-charcoal hover:bg-beige"
                >
                  قائمة الأمنيات
                  {wishlistCount > 0 ? ` (${wishlistCount})` : ""}
                </Link>
                <Link
                  href="/cart"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl px-4 py-3 text-lg font-medium text-charcoal hover:bg-beige"
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
                      // Defer so the closing mobile sheet doesn't deliver its
                      // click onto the login modal backdrop.
                      window.setTimeout(() => openLogin(), 0);
                    }}
                    className="w-full rounded-xl px-4 py-3 text-start text-lg font-medium text-charcoal hover:bg-beige"
                  >
                    دخول
                  </button>
                )}
              </div>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

function BrandLogo({
  scrolled,
  className,
  name = SITE_NAME,
  logoUrl,
}: {
  scrolled: boolean;
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
          className={cn(
            "object-contain transition-[height,width] duration-500",
            scrolled ? "h-8 sm:h-9" : "h-10 sm:h-12"
          )}
        />
      ) : (
        <span
          className={cn(
            "text-center font-[family-name:var(--font-cormorant)] font-semibold tracking-[0.22em] text-charcoal transition-[font-size,color,letter-spacing] duration-500 group-hover:text-gold",
            scrolled
              ? "text-xl sm:text-2xl md:text-[1.65rem]"
              : "text-2xl sm:text-3xl md:text-[2rem]"
          )}
        >
          {name}
        </span>
      )}
      <span className="mt-1 h-px w-0 bg-gold transition-all duration-500 group-hover:w-full" />
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
        "rounded-full p-2 text-charcoal/80 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:ring-offset-2",
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
        "relative rounded-full p-2 text-charcoal/80 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:ring-offset-2",
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

function DesktopNavItem({
  item,
  baseId,
  open,
  panelVariant,
  onOpen,
  onToggle,
  onClose,
}: {
  item: NavItem;
  baseId: string;
  open: boolean;
  panelVariant: "mega" | "compact";
  onOpen: () => void;
  onToggle: () => void;
  onClose: () => void;
}) {
  const hasPanel = itemHasPanel(item);

  if (!hasPanel) {
    return (
      <Link
        href={item.href}
        className="shrink-0 whitespace-nowrap px-2.5 py-2 text-[11px] font-medium tracking-[0.12em] text-charcoal/75 transition-colors hover:text-gold xl:px-3 xl:text-xs"
      >
        {item.label}
      </Link>
    );
  }

  const menuId = `${baseId}-${item.id}`;

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
    >
      <button
        type="button"
        className="inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-2.5 py-2 text-[11px] font-medium tracking-[0.12em] text-charcoal/75 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:ring-offset-2 xl:px-3 xl:text-xs"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
      >
        <span>{item.label}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 shrink-0 transition-transform duration-300",
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
        onNavigate={onClose}
      />
    </div>
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

  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
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
        aria-label="بحث"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-beige-dark/80 bg-ivory shadow-[0_24px_60px_-28px_rgba(44,36,25,0.45)]"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
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
            placeholder="ابحثي في المجموعات..."
            className="min-w-0 flex-1 bg-transparent text-base text-charcoal outline-none placeholder:text-muted/70"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق البحث"
            className="rounded-full p-1.5 text-muted transition-colors hover:text-charcoal"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </form>
        <ul className="max-h-72 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <li className="px-5 py-6 text-center text-sm text-muted">
              لا توجد نتائج
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
