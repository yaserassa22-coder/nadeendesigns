"use client";

import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CartItem } from "@/types/shop";
import { cartExperienceSubtotal } from "@/lib/products/order-experience";
import {
  cartNeedsShipping,
  lineRequiresShipping,
} from "@/lib/shop/shipping";
import {
  ensureUniqueCartLineIds,
  mergeCartLines,
  sameLineCustomizations,
} from "@/lib/shop/cart-lines";
import { sanitizeGuestCartItems } from "@/lib/guest/cart-items";
import {
  CartContext,
  type CartAddToCartInput as AddToCartInput,
  type CartContextValue,
} from "@/components/shop/cart-context";

const CART_KEY = "nadeen_shop_cart";

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return ensureUniqueCartLineIds(sanitizeGuestCartItems(parsed));
  } catch {
    return [];
  }
}

async function ensureGuestCookie(): Promise<void> {
  const res = await fetch("/api/guest/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ language: "ar" }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    console.error(
      "[cart] guest session failed",
      res.status,
      data.error ?? res.statusText
    );
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const syncTimer = useRef<number | null>(null);
  const syncGen = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        const local = loadCart();
        setItems(local);
        try {
          // Establish durable guest_id cookie before cart GET/PUT (Phase G).
          await ensureGuestCookie();
          const res = await fetch("/api/guest/cart", {
            credentials: "same-origin",
            cache: "no-store",
          });
          if (res.ok) {
            const data = (await res.json()) as { items?: CartItem[] };
            if (Array.isArray(data.items) && data.items.length) {
              const merged = mergeCartLines(
                local,
                sanitizeGuestCartItems(data.items)
              );
              setItems(merged);
            }
          } else {
            const data = (await res.json().catch(() => ({}))) as {
              error?: string;
            };
            console.error(
              "[cart] guest cart hydrate failed",
              res.status,
              data.error ?? res.statusText
            );
          }
        } catch (err) {
          console.error("[cart] guest cart hydrate error", err);
        }
        setReady(true);
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      /* ignore quota */
    }
    // Debounced server sync for guest durability across refresh/restart
    if (syncTimer.current) window.clearTimeout(syncTimer.current);
    const gen = ++syncGen.current;
    syncTimer.current = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/guest/cart", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ items }),
          });
          if (gen !== syncGen.current) return;
          if (!res.ok) {
            const data = (await res.json().catch(() => ({}))) as {
              error?: string;
            };
            // Do not suppress — surface for debugging while keeping local cart.
            console.error(
              "[cart] guest cart PUT failed",
              res.status,
              data.error ?? res.statusText
            );
          }
        } catch (err) {
          if (gen !== syncGen.current) return;
          console.error("[cart] guest cart PUT error", err);
        }
      })();
    }, 600);
    return () => {
      if (syncTimer.current) window.clearTimeout(syncTimer.current);
    };
  }, [items, ready]);

  const addItem = useCallback((input: AddToCartInput) => {
    setItems((prev) => {
      const quantity = input.quantity ?? 1;
      const existing = prev.find(
        (i) =>
          i.product_id === input.product_id &&
          i.product_type === input.product_type &&
          sameLineCustomizations(i, {
            personalization: input.personalization ?? null,
            gift_options: input.gift_options ?? null,
            order_options: input.order_options ?? null,
            extra_services: input.extra_services ?? null,
          })
      );
      if (existing) {
        return prev.map((i) =>
          i.line_id === existing.line_id
            ? { ...i, quantity: Math.min(20, i.quantity + quantity) }
            : i
        );
      }
      const next: CartItem = {
        line_id: crypto.randomUUID(),
        product_type: input.product_type,
        product_id: input.product_id,
        name_ar: input.name_ar,
        unit_price: input.unit_price,
        compare_at_price: input.compare_at_price ?? null,
        quantity,
        image: input.image,
        personalization: input.personalization ?? null,
        gift_options: input.gift_options ?? null,
        order_options: input.order_options?.length
          ? input.order_options
          : null,
        extra_services: input.extra_services?.length
          ? input.extra_services
          : null,
        personalization_fee:
          input.personalization_fee != null &&
          Number(input.personalization_fee) > 0
            ? Number(input.personalization_fee)
            : null,
        requires_shipping:
          input.requires_shipping ??
          lineRequiresShipping({
            product_type: input.product_type,
            requires_shipping: input.requires_shipping,
          }),
      };
      return [next, ...prev];
    });
  }, []);

  const updateQuantity = useCallback((lineId: string, quantity: number) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.line_id === lineId
            ? { ...i, quantity: Math.max(1, Math.min(20, quantity)) }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((lineId: string) => {
    setItems((prev) => prev.filter((i) => i.line_id !== lineId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const count = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = cartExperienceSubtotal(items);
    return {
      items,
      count,
      subtotal,
      needsShipping: cartNeedsShipping(items),
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    };
  }, [items, addItem, updateQuantity, removeItem, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export type { AddToCartInput, CartContextValue };
