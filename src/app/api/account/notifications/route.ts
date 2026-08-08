import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCustomerApi } from "@/lib/customer-auth/customer";
import { customerKeyFromContact } from "@/lib/customer-auth/otp";
import { bookingNotificationKeys } from "@/lib/notifications/customer-keys";
import { listInAppNotifications } from "@/lib/notifications/in-app";

/** In-app notifications for the signed-in customer (profile + linked bookings). */
export async function GET() {
  const auth = await requireCustomerApi();
  if (auth.error) return auth.error;

  const keySet = new Set(
    bookingNotificationKeys({
      phone: auth.customer.phone,
      email: auth.customer.email,
      customerKey:
        auth.customer.customer_key ||
        customerKeyFromContact(auth.customer.phone, auth.customer.email),
    })
  );

  const supabase = createAdminClient();

  // Pull phones/emails from this customer's bookings so appointment confirms
  // (stored under booking contact keys) always resolve in Account → الإشعارات.
  try {
    let bookingQuery = supabase
      .from("bookings")
      .select("id, phone, email, customer_id")
      .limit(40);

    if (auth.customer.id) {
      bookingQuery = bookingQuery.eq("customer_id", auth.customer.id);
    }

    let { data: bookings, error } = await bookingQuery;

    if (error || !bookings?.length) {
      // Fallback: match by phone/email when customer_id was never linked
      const orParts: string[] = [];
      if (auth.customer.phone?.trim()) {
        const p = auth.customer.phone.trim().replace(/,/g, "");
        orParts.push(`phone.eq.${p}`);
      }
      if (auth.customer.email?.trim()) {
        const e = auth.customer.email.trim().replace(/"/g, "");
        orParts.push(`email.ilike."${e}"`);
      }
      if (orParts.length) {
        const retry = await supabase
          .from("bookings")
          .select("id, phone, email, customer_id")
          .or(orParts.join(","))
          .limit(40);
        bookings = retry.data ?? [];
      }
    }

    for (const b of bookings ?? []) {
      for (const k of bookingNotificationKeys({
        phone: b.phone as string | null,
        email: b.email as string | null,
      })) {
        keySet.add(k);
      }
      if (b.id) keySet.add(`booking:${b.id}`);
    }
  } catch (e) {
    console.warn("[account/notifications] booking key expand failed", e);
  }

  const keys = [...keySet];
  const notifications = await listInAppNotifications({
    customerKeys: keys,
    limit: 40,
  });

  // Dedupe multi-key writes of the same event
  const seen = new Set<string>();
  const deduped = notifications.filter((n) => {
    const sig = `${n.title_ar}|${n.order_status}|${n.href ?? ""}|${n.body_ar.slice(0, 80)}`;
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });

  return NextResponse.json({ notifications: deduped });
}
