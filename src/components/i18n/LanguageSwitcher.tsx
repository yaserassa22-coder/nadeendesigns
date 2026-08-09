"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n";
import { useLocale } from "@/components/i18n/LocaleProvider";

type Variant = "storefront" | "admin";

interface LanguageSwitcherProps {
  variant?: Variant;
  className?: string;
  /** Compact icon-only trigger (header utilities). */
  compact?: boolean;
}

/**
 * Luxury language control — globe trigger → refined popover with native names.
 * Storefront options = Admin → Settings → General → enabled languages.
 * Admin always offers the full catalog.
 */
export function LanguageSwitcher({
  variant = "storefront",
  className,
  compact = true,
}: LanguageSwitcherProps) {
  const { locale, setLocale, t, storefrontLocales } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const isAdmin = variant === "admin";
  const choices: readonly Locale[] = isAdmin ? LOCALES : storefrontLocales;

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const select = (next: Locale) => {
    setLocale(next);
    setOpen(false);
  };

  // One enabled language → that is the site language; hide the switcher.
  if (!isAdmin && choices.length <= 1) {
    return null;
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={t.common.chooseLanguage}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "group inline-flex items-center gap-2 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:ring-offset-2",
          isAdmin
            ? "w-full justify-start rounded-xl px-4 py-3 text-sm font-medium text-charcoal hover:bg-beige"
            : compact
              ? "inline-flex size-9 items-center justify-center rounded-full text-charcoal/80 hover:text-gold sm:size-10 md:size-auto md:p-2"
              : "border border-gold/30 bg-ivory/70 px-3 py-1.5 text-charcoal/85 backdrop-blur-sm hover:border-gold/60 hover:text-gold"
        )}
      >
        <span className="relative inline-flex">
          <Globe2
            className={cn(
              "transition-transform duration-500 group-hover:rotate-12",
              isAdmin ? "h-4 w-4 text-gold" : "h-[1.125rem] w-[1.125rem]"
            )}
            strokeWidth={1.5}
          />
          <span
            aria-hidden
            className="absolute -bottom-0.5 -end-0.5 h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_0_1.5px_rgba(250,248,245,0.9)]"
          />
        </span>
        {(!compact || isAdmin) && (
          <span className="min-w-0 truncate tracking-wide">
            {isAdmin ? (
              <>
                <span className="text-muted">{t.common.language}</span>
                <span className="mx-1.5 text-gold/50">·</span>
                <span>{LOCALE_META[locale].nativeName}</span>
              </>
            ) : (
              LOCALE_META[locale].nativeName
            )}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            id={listId}
            role="listbox"
            aria-label={t.common.chooseLanguage}
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "absolute z-[80] min-w-[11.5rem] overflow-hidden rounded-2xl border border-beige-dark/90 bg-ivory/95 shadow-[0_20px_50px_-28px_rgba(44,36,25,0.55)] backdrop-blur-md",
              isAdmin
                ? "bottom-full start-0 mb-2 w-full"
                : "top-full end-0 mt-2"
            )}
          >
            <div className="border-b border-beige-dark/70 px-3.5 py-2.5">
              <p className="font-[family-name:var(--font-cormorant)] text-[11px] tracking-[0.18em] text-gold uppercase">
                {t.common.language}
              </p>
            </div>
            <ul className="p-1.5">
              {choices.map((code) => {
                const meta = LOCALE_META[code];
                const active = code === locale;
                return (
                  <li key={code}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => select(code)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors",
                        active
                          ? "bg-gold/10 text-charcoal"
                          : "text-charcoal/80 hover:bg-beige/80 hover:text-charcoal"
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold tracking-wide",
                          active
                            ? "border-gold/50 bg-gold/15 text-gold"
                            : "border-beige-dark bg-white/70 text-muted"
                        )}
                      >
                        {meta.mark}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-tight">
                          {meta.nativeName}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted">
                          {meta.englishName}
                        </span>
                      </span>
                      {active ? (
                        <motion.span
                          layoutId="nd-locale-active"
                          className="h-px w-5 bg-gold"
                          transition={{
                            type: "spring",
                            stiffness: 380,
                            damping: 28,
                          }}
                        />
                      ) : (
                        <span className="h-px w-5 bg-transparent" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
