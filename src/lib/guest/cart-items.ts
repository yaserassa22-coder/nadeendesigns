import type { CartItem, ShopProductType } from "@/types/shop";

const PRODUCT_TYPES = new Set<ShopProductType>([
  "veil",
  "bridal_robe",
  "dress",
]);

/**
 * Normalize client cart payloads before guest_carts JSONB upsert.
 * Rejects malformed lines so we never persist garbage (still returns 400
 * upstream when the whole body is not an array).
 */
export function sanitizeGuestCartItems(raw: unknown[]): CartItem[] {
  const out: CartItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const o = entry as Record<string, unknown>;
    const productType = o.product_type;
    const productId = o.product_id;
    const nameAr = o.name_ar;
    const unitPrice = o.unit_price;
    const quantity = o.quantity;
    if (typeof productType !== "string" || !PRODUCT_TYPES.has(productType as ShopProductType)) {
      continue;
    }
    if (typeof productId !== "string" || !productId.trim()) continue;
    if (typeof nameAr !== "string" || !nameAr.trim()) continue;
    if (typeof unitPrice !== "number" || !Number.isFinite(unitPrice) || unitPrice < 0) {
      continue;
    }
    if (typeof quantity !== "number" || !Number.isFinite(quantity)) continue;

    const lineId =
      typeof o.line_id === "string" && o.line_id.trim()
        ? o.line_id
        : crypto.randomUUID();

    out.push({
      line_id: lineId,
      product_type: productType as ShopProductType,
      product_id: productId.trim(),
      name_ar: nameAr.trim(),
      unit_price: unitPrice,
      quantity: Math.max(1, Math.min(20, Math.floor(quantity))),
      image: typeof o.image === "string" ? o.image : undefined,
      personalization:
        o.personalization && typeof o.personalization === "object"
          ? (o.personalization as CartItem["personalization"])
          : null,
      gift_options:
        o.gift_options && typeof o.gift_options === "object"
          ? (o.gift_options as CartItem["gift_options"])
          : null,
      requires_shipping:
        typeof o.requires_shipping === "boolean"
          ? o.requires_shipping
          : undefined,
    });
    if (out.length >= 50) break;
  }
  return out;
}
