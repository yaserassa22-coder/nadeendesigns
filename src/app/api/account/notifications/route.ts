import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCustomerApi } from "@/lib/customer-auth/customer";
import { customerKeyFromContact } from "@/lib/customer-auth/otp";

/** In-app notifications for the signed-in customer (by customer_key). */
export async function GET() {
  const auth = await requireCustomerApi();
  if (auth.error) return auth.error;

  const key =
    auth.customer.customer_key ||
    customerKeyFromContact(auth.customer.phone, auth.customer.email);

  const supabase = createAdminClient();
  let notifications: unknown[] = [];

  if (key) {
    const { data } = await supabase
      .from("customer_notifications")
      .select("*")
      .eq("customer_key", key)
      .order("created_at", { ascending: false })
      .limit(40);
    notifications = data ?? [];
  }

  // Also try phone/email loose match via order ids if empty
  if (notifications.length === 0 && auth.customer.phone) {
    const { data: orders } = await supabase
      .from("shop_orders")
      .select("id")
      .eq("phone", auth.customer.phone)
      .limit(20);
    const ids = (orders ?? []).map((o) => o.id);
    if (ids.length) {
      const { data } = await supabase
        .from("customer_notifications")
        .select("*")
        .in("order_id", ids)
        .order("created_at", { ascending: false })
        .limit(40);
      notifications = data ?? [];
    }
  }

  return NextResponse.json({ notifications });
}
