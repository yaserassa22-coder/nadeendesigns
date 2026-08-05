"use client";

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
}: ShopCustomizeAndBuyProps) {
  return (
    <div className="mt-10 rounded-3xl border border-beige-dark bg-white/80 p-6 shadow-sm md:p-8">
      <div className="mb-5">
        <p className="mb-1 text-sm text-gold">تخصيص وشراء</p>
        <h2 className="text-2xl font-bold text-charcoal">
          خصّصي منتجكِ وأضيفيه للسلة
        </h2>
        <p className="mt-2 text-sm text-muted">
          أضيفي للسلة أو اشتري الآن — التخصيص والخدمات الإضافية تظهر قبل الإتمام.
          عنوان التوصيل والملاحظات تُسأل عند الدفع فقط.
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
        enablePersonalization
        enableGiftWrapping
        requiresShipping
        size="lg"
      />
    </div>
  );
}
