import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isMissingTableError } from "@/lib/supabase/errors";
import { isValidGuestId } from "./id";
import { markGuestConverted } from "./session";

export type GuestMergeDetail = {
  wishlist: number;
  cart: number;
  orders: number;
  bookings: number;
  designs: number;
  addresses: number;
  reviews: number;
  notifications: number;
  recently_viewed: number;
  guest_id: string;
};

/**
 * Merge all guest-scoped data into a registered customer.
 * Dedupes wishlist by (product_kind, product_id). Preserves analytics via
 * converted_to_customer_id on guest_customers (row kept).
 */
export async function mergeGuestIntoCustomer(params: {
  guestId: string;
  customerId: string;
}): Promise<GuestMergeDetail> {
  const detail: GuestMergeDetail = {
    wishlist: 0,
    cart: 0,
    orders: 0,
    bookings: 0,
    designs: 0,
    addresses: 0,
    reviews: 0,
    notifications: 0,
    recently_viewed: 0,
    guest_id: params.guestId,
  };

  if (!isSupabaseConfigured() || !isValidGuestId(params.guestId)) {
    return detail;
  }

  const guestId = params.guestId.trim().toLowerCase();
  const customerId = params.customerId;
  const supabase = createAdminClient();

  try {
    // --- Wishlist: move guest rows; skip duplicates ---
    const { data: guestWish } = await supabase
      .from("wishlist_items")
      .select("*")
      .eq("guest_id", guestId);

    for (const item of guestWish ?? []) {
      const { data: existing } = await supabase
        .from("wishlist_items")
        .select("id")
        .eq("customer_id", customerId)
        .eq("product_kind", item.product_kind)
        .eq("product_id", item.product_id)
        .maybeSingle();

      if (existing) {
        await supabase.from("wishlist_items").delete().eq("id", item.id);
      } else {
        const { error } = await supabase
          .from("wishlist_items")
          .update({ customer_id: customerId, guest_id: null })
          .eq("id", item.id);
        if (!error) detail.wishlist += 1;
      }
    }

    // --- Cart: merge items into localStorage sync happens client-side;
    //     server stores under guest — attach note by clearing after read ---
    const { data: cart } = await supabase
      .from("guest_carts")
      .select("items")
      .eq("guest_id", guestId)
      .maybeSingle();
    if (cart?.items) {
      const items = Array.isArray(cart.items) ? cart.items : [];
      detail.cart = items.length;
      // Keep cart until client pulls & clears; mark by deleting after merge signal
      // Client CartProvider fetches /api/guest/cart?merge=1 on login success.
    }

    // --- Orders / bookings ---
    const { data: orders } = await supabase
      .from("shop_orders")
      .update({ customer_id: customerId })
      .eq("guest_id", guestId)
      .is("customer_id", null)
      .select("id");
    detail.orders += orders?.length ?? 0;

    // Also stamp guest_id orders that already have customer_id from guest checkout
    await supabase
      .from("shop_orders")
      .update({ customer_id: customerId })
      .eq("guest_id", guestId)
      .neq("customer_id", customerId);

    const { data: bookings } = await supabase
      .from("bookings")
      .update({ customer_id: customerId })
      .eq("guest_id", guestId)
      .select("id");
    detail.bookings += bookings?.length ?? 0;

    // --- Designs ---
    const { data: designs } = await supabase
      .from("saved_designs")
      .update({ customer_id: customerId, guest_id: null })
      .eq("guest_id", guestId)
      .select("id");
    detail.designs += designs?.length ?? 0;

    // --- Addresses ---
    const { data: addrs } = await supabase
      .from("customer_addresses")
      .update({ customer_id: customerId, guest_id: null })
      .eq("guest_id", guestId)
      .select("id");
    detail.addresses += addrs?.length ?? 0;

    // --- Reviews ---
    const { data: reviews } = await supabase
      .from("customer_reviews")
      .update({ customer_id: customerId, guest_id: null })
      .eq("guest_id", guestId)
      .select("id");
    detail.reviews += reviews?.length ?? 0;

    // --- Notifications ---
    try {
      const { data: notes } = await supabase
        .from("customer_notifications")
        .update({ customer_id: customerId, guest_id: null })
        .eq("guest_id", guestId)
        .select("id");
      detail.notifications += notes?.length ?? 0;
    } catch {
      /* optional table */
    }

    // --- Recently viewed ---
    const { data: views } = await supabase
      .from("recently_viewed")
      .update({ customer_id: customerId, guest_id: null })
      .eq("guest_id", guestId)
      .select("id");
    detail.recently_viewed += views?.length ?? 0;

    await markGuestConverted(guestId, customerId);
  } catch (e) {
    console.warn(
      "[guest merge]",
      e instanceof Error ? e.message : e
    );
  }

  return detail;
}

/** Read guest cart items for client merge after login (then delete). */
export async function takeGuestCartItems(
  guestId: string
): Promise<unknown[]> {
  if (!isSupabaseConfigured() || !isValidGuestId(guestId)) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("guest_carts")
    .select("items")
    .eq("guest_id", guestId.trim().toLowerCase())
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error, "guest_carts")) return [];
    return [];
  }
  const items = Array.isArray(data?.items) ? data!.items : [];
  await supabase
    .from("guest_carts")
    .delete()
    .eq("guest_id", guestId.trim().toLowerCase());
  return items as unknown[];
}
