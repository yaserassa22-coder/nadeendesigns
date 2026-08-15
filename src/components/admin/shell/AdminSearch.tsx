"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { AdminSearchGroup, AdminSearchGroupId } from "@/lib/admin/search";

const GROUP_LABEL: Record<AdminSearchGroupId, keyof DictionaryShell> = {
  products: "searchProducts",
  orders: "searchOrders",
  customers: "searchCustomers",
  bookings: "searchBookings",
  messages: "searchMessages",
  pages: "searchPages",
};

type DictionaryShell = {
  searchPlaceholder: string;
  searchEmpty: string;
  searchLoading: string;
  searchHint: string;
  searchProducts: string;
  searchOrders: string;
  searchCustomers: string;
  searchBookings: string;
  searchMessages: string;
  searchPages: string;
};

export function AdminSearch() {
  const { t } = useLocale();
  const s = t.admin.shellUi;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<AdminSearchGroup[]>([]);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const debounceRef = useRef<number>(0);

  const flat = useMemo(
    () => groups.flatMap((group) => group.hits.map((hit) => ({ group: group.id, hit }))),
    [groups]
  );

  useEffect(() => {
    const q = query.trim();
    window.clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, {
            cache: "no-store",
          });
          const json = (await res.json()) as { groups?: AdminSearchGroup[] };
          setGroups(Array.isArray(json.groups) ? json.groups : []);
          setActive(0);
        } catch {
          setGroups([]);
        } finally {
          setLoading(false);
        }
      })();
    }, 280);
    return () => window.clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        rootRef.current?.querySelector("input")?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((n) => Math.min(flat.length - 1, n + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((n) => Math.max(0, n - 1));
    } else if (event.key === "Enter") {
      const item = flat[active];
      if (item) {
        window.location.assign(item.hit.href);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const showPanel = open && query.trim().length >= 2;

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <label className="sr-only" htmlFor={`${listId}-input`}>
        {s.searchPlaceholder}
      </label>
      <Search className="pointer-events-none absolute start-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
      <input
        id={`${listId}-input`}
        type="search"
        value={query}
        autoComplete="off"
        placeholder={s.searchPlaceholder}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        className="h-11 w-full rounded-xl border border-[#e8e2d8] bg-[#faf8f5] pe-10 ps-10 text-[0.9375rem] text-charcoal placeholder:text-muted/70 focus:bg-white"
      />
      {query ? (
        <button
          type="button"
          className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:text-charcoal"
          aria-label={t.admin.close}
          onClick={() => {
            setQuery("");
            setGroups([]);
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}

      {showPanel ? (
        <div
          id={listId}
          role="listbox"
          className="absolute z-50 mt-2 max-h-[min(70vh,28rem)] w-full overflow-y-auto rounded-2xl border border-[#e8e2d8] bg-white p-2 shadow-xl"
        >
          {loading ? (
            <p className="flex items-center gap-2 px-3 py-4 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              {s.searchLoading}
            </p>
          ) : flat.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted">{s.searchEmpty}</p>
          ) : (
            groups.map((group) => (
              <div key={group.id} className="mb-2 last:mb-0">
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                  {s[GROUP_LABEL[group.id]]}
                </p>
                {group.hits.map((hit) => {
                  const index = flat.findIndex((row) => row.hit.id === hit.id);
                  const isActive = index === active;
                  return (
                    <Link
                      key={hit.id}
                      href={hit.href}
                      role="option"
                      aria-selected={isActive}
                      onClick={() => setOpen(false)}
                      onMouseEnter={() => setActive(index)}
                      className={cn(
                        "block rounded-xl px-3 py-2 text-sm",
                        isActive ? "bg-[#f4f0e8] text-charcoal" : "text-charcoal hover:bg-[#faf8f5]"
                      )}
                    >
                      <span className="block truncate font-medium">{hit.title}</span>
                      {hit.subtitle ? (
                        <span className="block truncate text-xs text-muted">{hit.subtitle}</span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
