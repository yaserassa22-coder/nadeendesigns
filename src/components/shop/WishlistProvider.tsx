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
import { useCustomerAuth } from "@/components/auth/CustomerAuthProvider";
import {
  type WishlistItem,
  wishlistItemKey,
} from "@/lib/shop/wishlist";

export type WishlistToggleInput = {
  productKind: string;
  productId: string;
  productSlug?: string | null;
  productTitle?: string | null;
  productImageUrl?: string | null;
  price?: number | null;
  salePrice?: number | null;
  nameAr?: string | null;
  nameEn?: string | null;
  nameHe?: string | null;
};

type WishlistContextValue = {
  items: WishlistItem[];
  count: number;
  ready: boolean;
  isSaved: (productKind: string, productId: string) => boolean;
  toggle: (input: WishlistToggleInput) => Promise<boolean>;
  remove: (input: {
    id?: string;
    productKind?: string;
    productId?: string;
  }) => Promise<boolean>;
  refresh: () => Promise<void>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

const LOCAL_KEY = "nadeen_wishlist_cache";

function readLocalCache(): WishlistItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WishlistItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalCache(items: WishlistItem[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
  } catch {
    /* ignore quota */
  }
}

async function ensureGuestCookie(): Promise<void> {
  try {
    await fetch("/api/guest/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ language: "ar" }),
    });
  } catch {
    /* non-fatal */
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, customer, loading: authLoading } = useCustomerAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [ready, setReady] = useState(false);
  const inflight = useRef(new Set<string>());
  const readyRef = useRef(false);
  const authKey = user?.id || customer?.id || "guest";

  const refresh = useCallback(async () => {
    try {
      await ensureGuestCookie();
      const res = await fetch("/api/guest/wishlist", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) {
        // Keep cache if API temporarily unavailable
        return;
      }
      const data = (await res.json()) as { items?: WishlistItem[] };
      const next = Array.isArray(data.items) ? data.items : [];
      setItems(next);
      writeLocalCache(next);
    } catch {
      /* non-fatal — keep current/local */
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        readyRef.current = false;
        setReady(false);
        const cached = readLocalCache();
        if (cached.length && !cancelled) setItems(cached);
        await refresh();
        if (cancelled) return;
        readyRef.current = true;
        setReady(true);
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [authLoading, authKey, refresh]);

  const isSaved = useCallback(
    (productKind: string, productId: string) =>
      items.some(
        (i) =>
          i.product_kind === productKind && i.product_id === productId
      ),
    [items]
  );

  const toggle = useCallback(
    async (input: WishlistToggleInput) => {
      const key = wishlistItemKey(input.productKind, input.productId);
      if (inflight.current.has(key)) return isSaved(input.productKind, input.productId);
      inflight.current.add(key);

      // Avoid guest_id races: cookie must exist before first write.
      if (!readyRef.current) {
        await ensureGuestCookie();
      }

      const saved = items.some(
        (i) =>
          i.product_kind === input.productKind &&
          i.product_id === input.productId
      );

      if (saved) {
        const prev = items;
        setItems((cur) => {
          const next = cur.filter(
            (i) =>
              !(
                i.product_kind === input.productKind &&
                i.product_id === input.productId
              )
          );
          writeLocalCache(next);
          return next;
        });
        try {
          const res = await fetch(
            `/api/guest/wishlist?product_id=${encodeURIComponent(input.productId)}&product_kind=${encodeURIComponent(input.productKind)}`,
            { method: "DELETE", credentials: "same-origin" }
          );
          if (!res.ok) {
            setItems(prev);
            writeLocalCache(prev);
            return true;
          }
          return false;
        } catch {
          setItems(prev);
          writeLocalCache(prev);
          return true;
        } finally {
          inflight.current.delete(key);
        }
      }

      const optimistic: WishlistItem = {
        id: `tmp-${key}`,
        product_kind: input.productKind,
        product_id: input.productId,
        product_slug: input.productSlug ?? null,
        product_title: input.productTitle ?? null,
        product_image_url: input.productImageUrl ?? null,
        price: input.price ?? null,
        sale_price: input.salePrice ?? null,
        name_ar: input.nameAr ?? null,
        name_en: input.nameEn ?? null,
        name_he: input.nameHe ?? null,
      };
      const prev = items;
      setItems((cur) => {
        if (
          cur.some(
            (i) =>
              i.product_kind === input.productKind &&
              i.product_id === input.productId
          )
        ) {
          return cur;
        }
        const next = [optimistic, ...cur];
        writeLocalCache(next);
        return next;
      });

      try {
        const res = await fetch("/api/guest/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            product_kind: input.productKind,
            product_id: input.productId,
            product_slug: input.productSlug ?? null,
            product_title: input.productTitle ?? null,
            product_image_url: input.productImageUrl ?? null,
            price: input.price ?? null,
            sale_price: input.salePrice ?? null,
            name_ar: input.nameAr ?? null,
            name_en: input.nameEn ?? null,
            name_he: input.nameHe ?? null,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          item?: WishlistItem;
          error?: string;
        };
        if (!res.ok) {
          setItems(prev);
          writeLocalCache(prev);
          return false;
        }
        if (data.item) {
          setItems((cur) => {
            const withoutTmp = cur.filter(
              (i) =>
                i.id !== optimistic.id &&
                !(
                  i.product_kind === input.productKind &&
                  i.product_id === input.productId
                )
            );
            const saved: WishlistItem = {
              ...data.item!,
              price: data.item!.price ?? optimistic.price,
              sale_price: data.item!.sale_price ?? optimistic.sale_price,
              name_ar: data.item!.name_ar ?? optimistic.name_ar,
              name_en: data.item!.name_en ?? optimistic.name_en,
              name_he: data.item!.name_he ?? optimistic.name_he,
            };
            const next = [saved, ...withoutTmp];
            writeLocalCache(next);
            return next;
          });
        }
        return true;
      } catch {
        setItems(prev);
        writeLocalCache(prev);
        return false;
      } finally {
        inflight.current.delete(key);
      }
    },
    [items, isSaved]
  );

  const remove = useCallback(
    async (input: {
      id?: string;
      productKind?: string;
      productId?: string;
    }) => {
      const target = items.find((i) => {
        if (input.id && i.id === input.id) return true;
        if (
          input.productId &&
          input.productKind &&
          i.product_id === input.productId &&
          i.product_kind === input.productKind
        ) {
          return true;
        }
        return false;
      });
      if (!target) return false;

      // Always remove (never add) — toggle would re-add if state raced.
      const prev = items;
      setItems((cur) => {
        const next = cur.filter((i) => i.id !== target.id);
        writeLocalCache(next);
        return next;
      });

      try {
        const qs = target.id.startsWith("tmp-")
          ? `product_id=${encodeURIComponent(target.product_id)}&product_kind=${encodeURIComponent(target.product_kind)}`
          : `id=${encodeURIComponent(target.id)}`;
        const res = await fetch(`/api/guest/wishlist?${qs}`, {
          method: "DELETE",
          credentials: "same-origin",
        });
        if (!res.ok) {
          setItems(prev);
          writeLocalCache(prev);
          return false;
        }
        return true;
      } catch {
        setItems(prev);
        writeLocalCache(prev);
        return false;
      }
    },
    [items]
  );

  const value = useMemo<WishlistContextValue>(
    () => ({
      items,
      count: items.length,
      ready,
      isSaved,
      toggle,
      remove,
      refresh,
    }),
    [items, ready, isSaved, toggle, remove, refresh]
  );

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error("useWishlist must be used within WishlistProvider");
  }
  return ctx;
}
