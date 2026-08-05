"use client";

import type { ReactNode } from "react";
import { ProductExperienceBuy } from "@/components/product/ProductExperienceBuy";
import type { ExtraServiceConfig } from "@/lib/products/order-experience";
import type {
  ExperienceSectionConfig,
  ProductExperienceConfig,
} from "@/lib/products/experience-designer";
import type { ShopProductType } from "@/types/shop";

interface ShopCustomizeAndBuyProps {
  productType: ShopProductType;
  productId: string;
  nameAr: string;
  price: number;
  /** Optional sale — when lower than price, cart charges sale and keeps compare-at. */
  salePrice?: number | null;
  image?: string;
  /** Resolved available extra services (store + product). Empty = none. */
  extraServices?: ExtraServiceConfig[];
  experienceConfig?: ProductExperienceConfig | null;
  sections?: ExperienceSectionConfig[];
  /** Compact wishlist — aligned with Add to Cart / Buy Now. */
  wishlist?: ReactNode;
  /** Drop top margin when nested in PDP actions (vs below slot). */
  flush?: boolean;
}

/**
 * Veil / robe purchase entry — wraps ProductExperienceBuy + modal.
 * Personalization UI lives inside ProductExperienceModal (existing atoms).
 * Delivery / notes / order options are collected at checkout only.
 */
export function ShopCustomizeAndBuy({
  productType,
  productId,
  nameAr,
  price,
  salePrice,
  image,
  extraServices = [],
  experienceConfig = null,
  sections = [],
  wishlist,
  flush = false,
}: ShopCustomizeAndBuyProps) {
  return (
    <div
      className={
        flush
          ? "rounded-[var(--xp-card-radius-lg)] border border-[color:var(--xp-border)] bg-[color:var(--xp-surface)] p-5 shadow-[var(--xp-shadow)] md:p-6"
          : "mt-10 rounded-[var(--xp-card-radius-lg)] border border-[color:var(--xp-border)] bg-[color:var(--xp-surface)] p-6 shadow-[var(--xp-shadow)] md:p-8"
      }
    >
      <div className="mb-6">
        <p className="mb-1 text-xs tracking-[0.2em] text-gold uppercase">
          تخصيص وشراء
        </p>
        <h2 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold tracking-wide text-charcoal">
          خصّصي منتجكِ
        </h2>
        <p className="mt-2 text-sm text-muted">
          التخصيص والخدمات تظهر قبل الإضافة — التوصيل والملاحظات عند الدفع فقط.
        </p>
      </div>
      <ProductExperienceBuy
        shopProductType={productType}
        productId={productId}
        nameAr={nameAr}
        price={price}
        salePrice={salePrice}
        image={image}
        extraServices={extraServices}
        experienceConfig={experienceConfig}
        sections={sections}
        wishlist={wishlist}
        enablePersonalization
        enableGiftWrapping
        requiresShipping
        size="lg"
      />
    </div>
  );
}
