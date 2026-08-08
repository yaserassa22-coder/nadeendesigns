"use client";

import { createContext, type Context } from "react";
import type { GiftOptions, ProductPersonalization } from "@/types/customization";
import type { CartItem, ShopProductType } from "@/types/shop";
import type {
  LineExtraService,
  LineOrderOptionValue,
} from "@/lib/products/order-experience";

/**
 * Cart context identity must be stable across Next/Turbopack route chunks.
 * Layout (CartProvider) and pages (useCart) can evaluate this module twice;
 * without a process-wide singleton they get different Context objects and
 * throw "useCart must be used within CartProvider" despite a real provider.
 */
const GLOBAL_KEY = "__nadeen_designs_cart_context__";

export type CartAddToCartInput = {
  product_type: ShopProductType;
  product_id: string;
  name_ar: string;
  name_en?: string | null;
  name_he?: string | null;
  /** Base charged unit price (use sale when on sale). */
  unit_price: number;
  /** Regular / list price when charging a sale price. */
  compare_at_price?: number | null;
  quantity?: number;
  image?: string;
  personalization?: ProductPersonalization | null;
  gift_options?: GiftOptions | null;
  order_options?: LineOrderOptionValue[] | null;
  extra_services?: LineExtraService[] | null;
  personalization_fee?: number | null;
  gift_fee?: number | null;
  /** Set true for future accessory products under اكسسوارات العروس */
  requires_shipping?: boolean;
};

export type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  needsShipping: boolean;
  addItem: (item: CartAddToCartInput) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  removeItem: (lineId: string) => void;
  clearCart: () => void;
};

type GlobalWithCart = typeof globalThis & {
  [GLOBAL_KEY]?: Context<CartContextValue | null>;
};

export function getCartContext(): Context<CartContextValue | null> {
  const g = globalThis as GlobalWithCart;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = createContext<CartContextValue | null>(null);
  }
  return g[GLOBAL_KEY];
}

export const CartContext = getCartContext();
