import type { CartItem } from "@/types/shop";

function stableJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

/** Compare line-level customizations (null/undefined treated equal). */
export function sameLineCustomizations(
  a: CartItem,
  b: Partial<CartItem>
): boolean {
  return (
    stableJson(a.personalization) === stableJson(b.personalization) &&
    stableJson(a.gift_options) === stableJson(b.gift_options) &&
    stableJson(a.order_options) === stableJson(b.order_options) &&
    stableJson(a.extra_services) === stableJson(b.extra_services)
  );
}

export function isSameCartLineIdentity(
  a: CartItem,
  b: Pick<CartItem, "product_id" | "product_type"> & Partial<CartItem>
): boolean {
  return (
    a.product_id === b.product_id &&
    a.product_type === b.product_type &&
    sameLineCustomizations(a, b)
  );
}

function newLineId(): string {
  return crypto.randomUUID();
}

/**
 * Merge cart arrays into a single list with unique `line_id`s.
 *
 * - Same `line_id` + same identity → one line, `max(qty)` (local↔server sync copies).
 * - Same `line_id` + different identity → remint incoming id (collision).
 * - Different ids + same product/customizations → combine quantities (true merges).
 * - Otherwise append; remint if `line_id` would collide.
 */
export function mergeCartLines(a: CartItem[], b: CartItem[]): CartItem[] {
  const out: CartItem[] = [];
  const indexByLineId = new Map<string, number>();

  const upsert = (raw: CartItem) => {
    let item: CartItem = {
      ...raw,
      line_id:
        typeof raw.line_id === "string" && raw.line_id.trim()
          ? raw.line_id.trim()
          : newLineId(),
      quantity: Math.max(1, Math.min(20, Math.floor(Number(raw.quantity) || 1))),
    };

    const byId = indexByLineId.get(item.line_id);
    if (byId !== undefined) {
      const existing = out[byId]!;
      if (isSameCartLineIdentity(existing, item)) {
        // Synced copies of the same durable line — do not double-count.
        existing.quantity = Math.max(existing.quantity, item.quantity);
        return;
      }
      item = { ...item, line_id: newLineId() };
    }

    const matchIdx = out.findIndex((i) => isSameCartLineIdentity(i, item));
    if (matchIdx >= 0) {
      const existing = out[matchIdx]!;
      existing.quantity = Math.min(20, existing.quantity + item.quantity);
      return;
    }

    let lineId = item.line_id;
    while (indexByLineId.has(lineId)) {
      lineId = newLineId();
    }
    const next = lineId === item.line_id ? item : { ...item, line_id: lineId };
    indexByLineId.set(next.line_id, out.length);
    out.push(next);
  };

  for (const item of a) upsert(item);
  for (const item of b) upsert(item);
  return out.slice(0, 50);
}

/** Normalize a single cart array so every `line_id` is unique. */
export function ensureUniqueCartLineIds(items: CartItem[]): CartItem[] {
  return mergeCartLines([], items);
}
