"use client";

import type { ReactNode } from "react";
import { CartProvider } from "@/components/shop/CartProvider";
import { CustomerAuthProvider } from "@/components/auth/CustomerAuthProvider";
import { WishlistProvider } from "@/components/shop/WishlistProvider";

/**
 * Single client boundary for storefront providers.
 * Keeps Cart / Auth / Wishlist as ONE tree (no nested CartProvider on pages).
 */
export function StorefrontProviders({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <CustomerAuthProvider>
        <WishlistProvider>{children}</WishlistProvider>
      </CustomerAuthProvider>
    </CartProvider>
  );
}
