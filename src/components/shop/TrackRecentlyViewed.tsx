"use client";

import { useEffect } from "react";

/** Fire-and-forget recently-viewed ping for guests and customers. */
export function TrackRecentlyViewed(props: {
  productKind: string;
  productId: string;
  productSlug?: string | null;
  productTitle?: string | null;
  productImageUrl?: string | null;
}) {
  useEffect(() => {
    const t = window.setTimeout(() => {
      void fetch("/api/guest/recently-viewed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          product_kind: props.productKind,
          product_id: props.productId,
          product_slug: props.productSlug ?? null,
          product_title: props.productTitle ?? null,
          product_image_url: props.productImageUrl ?? null,
        }),
      }).catch(() => undefined);
    }, 400);
    return () => window.clearTimeout(t);
  }, [
    props.productKind,
    props.productId,
    props.productSlug,
    props.productTitle,
    props.productImageUrl,
  ]);

  return null;
}
