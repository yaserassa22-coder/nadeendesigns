import type { WornByYouItem, WornByYouProductKind } from "@/types";

export function wornByYouProductHref(
  kind: WornByYouProductKind | null | undefined,
  productId: string | null | undefined
): string | null {
  const id = productId?.trim();
  if (!kind || !id) return null;
  if (kind === "dress") return `/dresses/${id}`;
  if (kind === "veil") return `/veils/${id}`;
  if (kind === "bridal_robe") return `/robes/${id}`;
  return null;
}

export function wornByYouAlt(item: WornByYouItem, fallback: string): string {
  const alt = item.alt_text?.trim();
  if (alt) return alt;
  const name = item.customer_name?.trim();
  const caption = item.caption?.trim();
  if (name && caption) return `${name} — ${caption}`;
  if (name) return name;
  if (caption) return caption;
  return fallback;
}

export function isMissingWornByYouTableError(message: string | undefined): boolean {
  if (!message) return false;
  return /worn_by_you_items|PGRST205|42P01/i.test(message);
}
