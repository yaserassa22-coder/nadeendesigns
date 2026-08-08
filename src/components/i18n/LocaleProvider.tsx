"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  DEFAULT_LOCALE,
  LOCALES,
  getDictionary,
  localeDir,
  normalizeEnabledLocales,
  resolveEnabledLocale,
  type Dictionary,
  type Locale,
} from "@/lib/i18n";
import {
  applyDocumentLocale,
  persistLocale,
  readStoredLocale,
} from "@/lib/i18n/storage";

type LocaleContextValue = {
  locale: Locale;
  dir: "rtl" | "ltr";
  dictionary: Dictionary;
  setLocale: (next: Locale) => void;
  t: Dictionary;
  /** Languages customers may use (admin-managed). */
  storefrontLocales: Locale[];
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function isAdminPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function LocaleProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
  allowedLocales,
  storeDefaultLocale,
}: {
  children: ReactNode;
  /** Server-resolved locale for first paint. */
  initialLocale?: Locale;
  /**
   * Storefront allowlist from Admin → Settings → General.
   * Admin routes ignore this and keep the full catalog.
   */
  allowedLocales?: readonly Locale[] | string[];
  /** Fallback when a saved language is not enabled for customers. */
  storeDefaultLocale?: Locale | string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const admin = isAdminPath(pathname);

  const storefrontLocales = useMemo(
    () => normalizeEnabledLocales(allowedLocales ?? LOCALES),
    [allowedLocales]
  );

  const effectiveAllowed = admin ? ([...LOCALES] as Locale[]) : storefrontLocales;
  const fallback =
    (typeof storeDefaultLocale === "string" && storeDefaultLocale) ||
    storefrontLocales[0] ||
    DEFAULT_LOCALE;

  const clamp = useCallback(
    (value: unknown) =>
      resolveEnabledLocale(value, effectiveAllowed, fallback),
    [effectiveAllowed, fallback]
  );

  const [locale, setLocaleState] = useState<Locale>(() =>
    resolveEnabledLocale(
      initialLocale,
      normalizeEnabledLocales(allowedLocales ?? LOCALES),
      storeDefaultLocale ?? DEFAULT_LOCALE
    )
  );
  const didHydrate = useRef(false);
  const pendingClientLocale = useRef<Locale | null>(null);
  const allowKey = effectiveAllowed.join(",");

  const applyLocale = useCallback(
    (next: Locale, { refresh }: { refresh: boolean }) => {
      setLocaleState(next);
      persistLocale(next);
      applyDocumentLocale(next);
      if (refresh) router.refresh();
    },
    [router]
  );

  // First client paint: honor cookie only if still enabled for this area.
  useEffect(() => {
    if (didHydrate.current) return;
    didHydrate.current = true;

    const stored = readStoredLocale();
    const next = clamp(stored ?? initialLocale);
    pendingClientLocale.current = next;
    applyLocale(next, { refresh: next !== initialLocale });
  }, [applyLocale, clamp, initialLocale]);

  // When admin toggles enabled languages (or leaving/entering admin), re-clamp.
  useEffect(() => {
    if (!didHydrate.current) return;
    const next = clamp(locale);
    if (next === locale) return;
    pendingClientLocale.current = next;
    applyLocale(next, { refresh: true });
  }, [allowKey, clamp, locale, applyLocale]);

  // Adopt SSR cookie updates after client-driven switches settle.
  useEffect(() => {
    if (!didHydrate.current) return;

    if (pendingClientLocale.current) {
      if (clamp(initialLocale) === pendingClientLocale.current) {
        pendingClientLocale.current = null;
      }
      return;
    }

    const next = clamp(initialLocale);
    if (next !== locale) {
      applyLocale(next, { refresh: false });
    }
  }, [initialLocale, locale, clamp, applyLocale]);

  const setLocale = useCallback(
    (next: Locale) => {
      const resolved = clamp(next);
      if (resolved === locale) return;
      pendingClientLocale.current = resolved;
      applyLocale(resolved, { refresh: true });
    },
    [locale, clamp, applyLocale]
  );

  const dictionary = useMemo(() => getDictionary(locale), [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir: localeDir(locale),
      dictionary,
      setLocale,
      t: dictionary,
      storefrontLocales,
    }),
    [locale, dictionary, setLocale, storefrontLocales]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    const dictionary = getDictionary(DEFAULT_LOCALE);
    return {
      locale: DEFAULT_LOCALE,
      dir: "rtl",
      dictionary,
      setLocale: () => {},
      t: dictionary,
      storefrontLocales: [...LOCALES],
    };
  }
  return ctx;
}

export function useDictionary(): Dictionary {
  return useLocale().t;
}
