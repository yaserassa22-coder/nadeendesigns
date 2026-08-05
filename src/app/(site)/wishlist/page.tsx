import type { Metadata } from "next";
import { WishlistPage } from "@/components/shop/WishlistPage";

export const metadata: Metadata = {
  title: "قائمة الأمنيات | NadEEN Designs",
  description: "قطعكِ المحفوظة — متاحة للزائرات وللحساب المسجّل.",
};

export default function PublicWishlistRoute() {
  return <WishlistPage />;
}
