"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { GiftOptions, ProductPersonalization } from "@/types/customization";
import type { CartItem, ShopProductType } from "@/types/shop";
import {
  cartNeedsShipping,
  lineRequiresShipping,
} from "@/lib/shop/shipping";

const CART_KEY = "nadeen_shop_cart";

interface AddToCartInput {
  product_type: ShopProductType;
  product_id: string;
  name_ar: string;
  unit_price: number;
  quantity?: number;
  image?: string;
  personalization?: ProductPersonalization | null;
  gift_options?: GiftOptions | null;
  /** Set true for future accessory products under اكسسوارات العروس */
  requires_shipping?: boolean;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  needsShipping: boolean;
  addItem: (item: AddToCartInput) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  removeItem: (lineId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CartItem[];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setItems(loadCart());
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, ready]);

  const addItem = useCallback((input: AddToCartInput) => {
    setItems((prev) => {
      const quantity = input.quantity ?? 1;
      const existing = prev.find(
        (i) =>
          i.product_id === input.product_id &&
          i.product_type === input.product_type &&
          JSON.stringify(i.personalization) ===
            JSON.stringify(input.personalization ?? null) &&
          JSON.stringify(i.gift_options) ===
            JSON.stringify(input.gift_options ?? null)
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
        quantity,
        image: input.image,
        personalization: input.personalization ?? null,
        gift_options: input.gift_options ?? null,
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
    const subtotal = items.reduce(
      (sum, i) => sum + i.unit_price * i.quantity,
      0
    );
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
