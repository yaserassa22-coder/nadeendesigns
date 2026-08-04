"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import type { NavChild, NavItem } from "@/lib/categories/nav";
import { cn } from "@/lib/utils";

type PanelVariant = "mega" | "compact";

interface LuxuryNavPanelProps {
  item: NavItem;
  open: boolean;
  variant: PanelVariant;
  onNavigate: () => void;
  id: string;
}

function hasPromo(item: NavItem): boolean {
  return Boolean(
    item.coverImageUrl ||
      item.description ||
      item.featured ||
      item.children.some((c) => c.featured && c.coverImageUrl)
  );
}

function featuredChild(item: NavItem): NavChild | null {
  return (
    item.children.find((c) => c.featured && (c.coverImageUrl || c.description)) ??
    item.children.find((c) => c.featured) ??
    null
  );
}

function ChildCard({
  child,
  onNavigate,
}: {
  child: NavChild;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={child.href}
      role="menuitem"
      onClick={onNavigate}
      className="group flex flex-col gap-2 rounded-xl p-2 transition-colors hover:bg-beige/60 focus-visible:bg-beige/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
    >
      {child.coverImageUrl ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-beige">
          <Image
            src={child.coverImageUrl}
            alt=""
            fill
            sizes="(max-width: 1280px) 140px, 180px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        </div>
      ) : null}
      <div className="min-w-0 px-0.5">
        <p className="truncate text-sm font-medium text-charcoal transition-colors group-hover:text-gold">
          {child.label}
        </p>
        {child.description ? (
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted">
            {child.description}
          </p>
        ) : null}
        <span className="mt-1.5 inline-block text-[11px] tracking-wide text-gold opacity-0 transition-opacity group-hover:opacity-100">
          استكشفي
        </span>
      </div>
    </Link>
  );
}

function CompactList({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate: () => void;
}) {
  const rows =
    item.kind === "more" && item.overflowItems?.length
      ? item.overflowItems
      : null;

  if (rows) {
    return (
      <div className="max-h-[70vh] min-w-[220px] overflow-y-auto py-2">
        {rows.map((parent) => (
          <div key={parent.id} className="border-b border-beige-dark/40 last:border-0">
            <Link
              href={parent.href}
              role="menuitem"
              onClick={onNavigate}
              className="block px-4 py-2.5 text-sm font-medium text-gold hover:bg-beige focus-visible:bg-beige focus-visible:outline-none"
            >
              {parent.label}
            </Link>
            {parent.children.map((child) => (
              <Link
                key={child.id}
                href={child.href}
                role="menuitem"
                onClick={onNavigate}
                className="block px-4 py-2 ps-6 text-sm text-charcoal hover:bg-beige hover:text-gold focus-visible:bg-beige focus-visible:outline-none"
              >
                {child.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-h-[70vh] min-w-[200px] overflow-y-auto py-2">
      <Link
        href={item.href}
        role="menuitem"
        onClick={onNavigate}
        className="block border-b border-beige-dark/50 px-4 py-2.5 text-sm font-medium text-gold hover:bg-beige focus-visible:bg-beige focus-visible:outline-none"
      >
        عرض الكل
      </Link>
      {item.children.map((child) => (
        <Link
          key={child.id}
          href={child.href}
          role="menuitem"
          onClick={onNavigate}
          className="block px-4 py-2.5 text-sm text-charcoal hover:bg-beige hover:text-gold focus-visible:bg-beige focus-visible:outline-none"
        >
          {child.label}
        </Link>
      ))}
    </div>
  );
}

function MegaPanel({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate: () => void;
}) {
  const promo = hasPromo(item);
  const featured = featuredChild(item);
  const promoImage = item.coverImageUrl || featured?.coverImageUrl || null;
  const promoTitle = item.featured
    ? item.label
    : featured?.label ?? item.label;
  const promoDesc =
    item.description || featured?.description || null;
  const promoHref = featured?.href ?? item.href;

  const columns =
    item.kind === "more" && item.overflowItems?.length
      ? item.overflowItems
      : null;

  if (columns) {
    return (
      <div className="grid gap-6 p-6 sm:grid-cols-2 xl:grid-cols-3">
        {columns.map((parent) => (
          <div key={parent.id} className="min-w-0">
            <Link
              href={parent.href}
              onClick={onNavigate}
              className="font-[family-name:var(--font-cormorant)] text-lg tracking-wide text-charcoal transition-colors hover:text-gold"
            >
              {parent.label}
            </Link>
            <div className="mt-3 h-px w-10 bg-gold/50" />
            <ul className="mt-3 space-y-1.5">
              {parent.children.length ? (
                parent.children.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={child.href}
                      role="menuitem"
                      onClick={onNavigate}
                      className="text-sm text-charcoal/80 transition-colors hover:text-gold"
                    >
                      {child.label}
                    </Link>
                  </li>
                ))
              ) : (
                <li>
                  <Link
                    href={parent.href}
                    role="menuitem"
                    onClick={onNavigate}
                    className="text-sm text-gold"
                  >
                    عرض المجموعة
                  </Link>
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  const cards = item.children;
  const gridCols =
    cards.length >= 4
      ? "xl:grid-cols-4"
      : cards.length === 3
        ? "xl:grid-cols-3"
        : "xl:grid-cols-2";

  return (
    <div
      className={cn(
        "grid gap-6 p-6 lg:gap-8",
        promo ? "xl:grid-cols-[minmax(0,1fr)_220px]" : ""
      )}
    >
      <div className="min-w-0">
        <div className="mb-4 flex items-end justify-between gap-4 border-b border-beige-dark/60 pb-3">
          <div>
            <p className="font-[family-name:var(--font-cormorant)] text-xl tracking-wide text-charcoal">
              {item.label}
            </p>
            {item.description ? (
              <p className="mt-1 max-w-md text-xs text-muted">{item.description}</p>
            ) : null}
          </div>
          <Link
            href={item.href}
            onClick={onNavigate}
            className="shrink-0 text-xs font-medium tracking-wide text-gold transition-colors hover:text-gold-dark"
          >
            عرض الكل
          </Link>
        </div>
        {cards.length > 0 ? (
          <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-3", gridCols)}>
            {cards.map((child) => (
              <ChildCard key={child.id} child={child} onNavigate={onNavigate} />
            ))}
          </div>
        ) : null}
      </div>

      {promo ? (
        <Link
          href={promoHref}
          onClick={onNavigate}
          className="group relative flex min-h-[200px] flex-col justify-end overflow-hidden rounded-2xl bg-beige"
        >
          {promoImage ? (
            <Image
              src={promoImage}
              alt=""
              fill
              sizes="220px"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/25 to-transparent" />
          <div className="relative z-10 p-4 text-white">
            <p className="font-[family-name:var(--font-cormorant)] text-lg tracking-wide">
              {promoTitle}
            </p>
            {promoDesc ? (
              <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-white/85">
                {promoDesc}
              </p>
            ) : null}
            <span className="mt-3 inline-block text-[11px] tracking-[0.15em] text-gold-light">
              اكتشفي المزيد
            </span>
          </div>
        </Link>
      ) : null}
    </div>
  );
}

export function LuxuryNavPanel({
  item,
  open,
  variant,
  onNavigate,
  id,
}: LuxuryNavPanelProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          id={id}
          role="menu"
          aria-label={item.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "absolute z-50 overflow-hidden border border-beige-dark/80 bg-ivory shadow-[0_18px_50px_-20px_rgba(44,36,25,0.35)]",
            variant === "mega"
              ? "start-0 top-full mt-3 w-[min(920px,calc(100vw-3rem))] rounded-2xl"
              : "start-0 top-full mt-2 rounded-xl"
          )}
        >
          {variant === "mega" ? (
            <MegaPanel item={item} onNavigate={onNavigate} />
          ) : (
            <CompactList item={item} onNavigate={onNavigate} />
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
