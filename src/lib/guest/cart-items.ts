import type { CartItem, ShopProductType } from "@/types/shop";
import type {
  LineExtraService,
  LineOrderOptionValue,
} from "@/lib/products/order-experience";
import { ensureUniqueCartLineIds } from "@/lib/shop/cart-lines";

const PRODUCT_TYPES = new Set<ShopProductType>([
  "veil",
  "bridal_robe",
  "dress",
  "accessory_item",
]);

function sanitizeOrderOptions(raw: unknown): LineOrderOptionValue[] | null {
  if (!Array.isArray(raw) || !raw.length) return null;
  const out: LineOrderOptionValue[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const o = entry as Record<string, unknown>;
    if (typeof o.key !== "string" || !o.key.trim()) continue;
    if (typeof o.value !== "string" || !o.value.trim()) continue;
    out.push({
      key: o.key as LineOrderOptionValue["key"],
      label: typeof o.label === "string" ? o.label : o.key,
      label_ar: typeof o.label_ar === "string" ? o.label_ar : o.key,
      value: o.value.trim(),
    });
  }
  return out.length ? out : null;
}

function sanitizeExtraServices(raw: unknown): LineExtraService[] | null {
  if (!Array.isArray(raw) || !raw.length) return null;
  const out: LineExtraService[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const o = entry as Record<string, unknown>;
    if (typeof o.id !== "string" || !o.id.trim()) continue;
    const price = Number(o.price);
    const pricing_mode =
      o.pricing_mode === "FREE" || o.pricing_mode === "FIXED_PRICE"
        ? o.pricing_mode
        : undefined;
    out.push({
      id: o.id.trim(),
      name: typeof o.name === "string" ? o.name : o.id,
      name_ar: typeof o.name_ar === "string" ? o.name_ar : o.id,
      price: Number.isFinite(price) && price >= 0 ? price : 0,
      ...(pricing_mode ? { pricing_mode } : {}),
    });
  }
  return out.length ? out : null;
}

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
    if (
      typeof productType !== "string" ||
      !PRODUCT_TYPES.has(productType as ShopProductType)
    ) {
      continue;
    }
    if (typeof productId !== "string" || !productId.trim()) continue;
    if (typeof nameAr !== "string" || !nameAr.trim()) continue;
    if (
      typeof unitPrice !== "number" ||
      !Number.isFinite(unitPrice) ||
      unitPrice < 0
    ) {
      continue;
    }
    if (typeof quantity !== "number" || !Number.isFinite(quantity)) continue;

    const lineId =
      typeof o.line_id === "string" && o.line_id.trim()
        ? o.line_id
        : crypto.randomUUID();

    const persFee = Number(o.personalization_fee);
    const giftFee = Number(o.gift_fee);

    out.push({
      line_id: lineId,
      product_type: productType as ShopProductType,
      product_id: productId.trim(),
      name_ar: nameAr.trim(),
      unit_price: unitPrice,
      compare_at_price:
        typeof o.compare_at_price === "number" &&
        Number.isFinite(o.compare_at_price) &&
        o.compare_at_price >= 0
          ? o.compare_at_price
          : null,
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
      order_options: sanitizeOrderOptions(o.order_options),
      extra_services: sanitizeExtraServices(o.extra_services),
      personalization_fee:
        Number.isFinite(persFee) && persFee > 0 ? persFee : null,
      gift_fee: Number.isFinite(giftFee) && giftFee > 0 ? giftFee : null,
      requires_shipping:
        typeof o.requires_shipping === "boolean"
          ? o.requires_shipping
          : undefined,
    });
    if (out.length >= 50) break;
  }
  // Persist unique line_ids only — duplicate ids break React keys + qty updates.
  return ensureUniqueCartLineIds(out);
}
