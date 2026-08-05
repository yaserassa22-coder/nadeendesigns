import type { ReactNode } from "react";
import {
  ProductCardOverlay,
  ProductCardImageCounter,
} from "@/components/product/ProductCardOverlay";
import { ProductCardBadges } from "@/components/product/ProductCardBadges";

type ProductCardMediaOverlayProps = {
  current: number;
  total: number;
  wishlist: ReactNode;
  price?: number | null;
  salePrice?: number | null;
  isFeatured?: boolean | null;
  tags?: string[] | null;
};

/**
 * Standard storefront card chrome: badges + wishlist + multi-image counter.
 * Always compose via ProductCardOverlay — never ad-hoc absolute positions.
 */
export function ProductCardMediaOverlay({
  current,
  total,
  wishlist,
  price,
  salePrice,
  isFeatured,
  tags,
}: ProductCardMediaOverlayProps) {
  return (
    <ProductCardOverlay
      badges={
        <ProductCardBadges
          price={price}
          salePrice={salePrice}
          isFeatured={isFeatured}
          tags={tags}
        />
      }
      wishlist={wishlist}
      imageCounter={
        <ProductCardImageCounter current={current} total={total} />
      }
    />
  );
}
