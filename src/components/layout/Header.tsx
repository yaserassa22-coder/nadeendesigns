"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useState, useEffect } from "react";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useCart } from "@/components/shop/CartProvider";

/** صف التصنيفات الأول */
const PRIMARY_CATEGORY_LINKS = [
  { href: "/wedding-dresses", label: "فساتين الزفاف" },
  { href: "/nouf-dresses", label: "فساتين نوف" },
  { href: "/rental-dresses", label: "فساتين للإيجار" },
  { href: "/custom-design", label: "تصميم فستان خاص" },
] as const;

/** صف التصنيفات الثاني: الطرحات يمين · برنص عروس يسارها */
const SECONDARY_CATEGORY_LINKS = [
  { href: "/veils", label: "الطرحات" },
  { href: "/robes", label: "برنص عروس" },
] as const;

const UTILITY_LINKS = [
  { href: "/cart", label: "السلة" },
  { href: "/gallery", label: "معرض الصور" },
  { href: "/booking", label: "احجزي موعدًا" },
  { href: "/about", label: "من نحن" },
  { href: "/contact", label: "اتصل بنا" },
] as const;

const ALL_MOBILE_LINKS = [
  { href: "/", label: "الرئيسية" },
  ...PRIMARY_CATEGORY_LINKS,
  ...SECONDARY_CATEGORY_LINKS,
  ...UTILITY_LINKS,
] as const;

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { count } = useCart();

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

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-500",
        scrolled
          ? "border-b border-beige-dark bg-white/95 py-3 shadow-sm backdrop-blur-md"
          : "bg-transparent py-5"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
        <button
          type="button"
          className="lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="فتح القائمة"
        >
          <Menu className="h-6 w-6 text-charcoal" />
        </button>

        {/* يمين الشعار (RTL): صف التصنيفات الأول */}
        <nav className="hidden min-w-0 flex-1 items-center justify-start gap-x-2 lg:flex xl:gap-x-3">
          {PRIMARY_CATEGORY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 text-[13px] font-medium text-charcoal/80 transition-colors hover:text-gold xl:text-sm"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link href="/" className="group flex shrink-0 flex-col items-center px-2">
          <span className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold tracking-widest text-charcoal transition-colors group-hover:text-gold md:text-3xl">
            {SITE_NAME}
          </span>
          <span className="mt-0.5 h-px w-0 bg-gold transition-all duration-500 group-hover:w-full" />
        </Link>

        {/* يسار الشعار: الطرحات ثم برنص عروس، ثم الروابط الأخرى */}
        <nav className="hidden flex-1 flex-wrap items-center justify-end gap-x-3 gap-y-2 lg:flex xl:gap-4">
          {SECONDARY_CATEGORY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-charcoal/80 transition-colors hover:text-gold"
            >
              {link.label}
            </Link>
          ))}
          {UTILITY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative text-sm font-medium text-charcoal/80 transition-colors hover:text-gold"
            >
              {link.label}
              {link.href === "/cart" && count > 0 && (
                <span className="absolute -top-2 -left-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] text-white">
                  {count}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <Link
          href="/cart"
          className="relative rounded-full p-2 text-charcoal hover:text-gold lg:hidden"
          aria-label="السلة"
        >
          <ShoppingBag className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] text-white">
              {count}
            </span>
          )}
        </Link>
      </div>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-ivory lg:hidden"
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
          <nav className="flex flex-col gap-2 px-6 py-4">
            {ALL_MOBILE_LINKS.map((link) => (
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
          </nav>
        </motion.div>
      )}
    </header>
  );
}
