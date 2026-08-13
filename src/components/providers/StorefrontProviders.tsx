"use client";

import { useLayoutEffect, type ReactNode } from "react";
import { CartProvider } from "@/components/shop/CartProvider";
import { CustomerAuthProvider } from "@/components/auth/CustomerAuthProvider";
import { WishlistProvider } from "@/components/shop/WishlistProvider";
import { MobileSwipeBack } from "@/components/layout/MobileSwipeBack";

/**
 * Single client boundary for storefront providers.
 * Keeps Cart / Auth / Wishlist as ONE tree (no nested CartProvider on pages).
 */
export function StorefrontProviders({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    document.body.dataset.storefront = "";
    return () => {
      delete document.body.dataset.storefront;
    };
  }, []);

  return (
    <CartProvider>
      <CustomerAuthProvider>
        <WishlistProvider>
          <MobileSwipeBack />
          {children}
        </WishlistProvider>
      </CustomerAuthProvider>
    </CartProvider>
  );
}
