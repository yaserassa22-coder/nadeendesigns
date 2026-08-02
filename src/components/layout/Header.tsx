"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { NAV_LINKS, SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 md:px-8">
        <button
          type="button"
          className="lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="فتح القائمة"
        >
          <Menu className="h-6 w-6 text-charcoal" />
        </button>

        <nav className="hidden flex-1 gap-6 lg:flex">
          {NAV_LINKS.slice(0, 5).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-charcoal/80 transition-colors hover:text-gold"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link href="/" className="group flex flex-col items-center">
          <span className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold tracking-widest text-charcoal transition-colors group-hover:text-gold md:text-3xl">
            {SITE_NAME}
          </span>
          <span className="mt-0.5 h-px w-0 bg-gold transition-all duration-500 group-hover:w-full" />
        </Link>

        <nav className="hidden flex-1 justify-end gap-6 lg:flex">
          {NAV_LINKS.slice(5).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-charcoal/80 transition-colors hover:text-gold"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="w-6 lg:hidden" />
      </div>

      {/* Mobile menu */}
      <motion.div
        initial={false}
        animate={mobileOpen ? { opacity: 1, pointerEvents: "auto" as const } : { opacity: 0, pointerEvents: "none" as const }}
        className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-sm lg:hidden"
        onClick={() => setMobileOpen(false)}
      />
      <motion.nav
        initial={false}
        animate={mobileOpen ? { x: 0 } : { x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 z-50 flex h-full w-[min(320px,85vw)] flex-col bg-ivory shadow-2xl lg:hidden"
      >
        <div className="flex items-center justify-between border-b border-beige-dark p-6">
          <span className="font-[family-name:var(--font-cormorant)] text-xl font-semibold tracking-widest">
            {SITE_NAME}
          </span>
          <button type="button" onClick={() => setMobileOpen(false)} aria-label="إغلاق">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-6">
          {NAV_LINKS.map((link, i) => (
            <motion.div
              key={link.href}
              initial={{ opacity: 0, x: 20 }}
              animate={mobileOpen ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-xl px-4 py-3 text-lg font-medium transition-colors hover:bg-beige hover:text-gold"
              >
                {link.label}
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.nav>
    </header>
  );
}
