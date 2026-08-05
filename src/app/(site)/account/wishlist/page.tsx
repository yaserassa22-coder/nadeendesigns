import { redirect } from "next/navigation";

/** Account wishlist is public at /wishlist (guest + logged-in). */
export default function AccountWishlistRedirect() {
  redirect("/wishlist");
}
