import type { Metadata } from "next";
import { WishlistPage } from "@/components/shop/WishlistPage";
import { getStorefrontLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getStorefrontLocale();
  const t = getDictionary(locale);
  return {
    title: `${t.wishlist.title} | NadEEN Designs`,
    description: t.wishlist.emptyDescription,
  };
}

export default function PublicWishlistRoute() {
  return <WishlistPage />;
}
