import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCustomerApi } from "@/lib/customer-auth/customer";
import { customerKeyFromContact } from "@/lib/customer-auth/otp";
import { bookingNotificationKeys } from "@/lib/notifications/customer-keys";
import { listInAppNotifications, clearInAppNotifications } from "@/lib/notifications/in-app";

async function resolveAccountNotificationKeys(customer: {
  id: string;
  phone?: string | null;
  email?: string | null;
  customer_key?: string | null;
}): Promise<string[]> {
  const keySet = new Set(
    bookingNotificationKeys({
      phone: customer.phone,
      email: customer.email,
      customerKey:
        customer.customer_key ||
        customerKeyFromContact(customer.phone, customer.email),
    })
  );

  const supabase = createAdminClient();

  try {
    let bookingQuery = supabase
      .from("bookings")
      .select("id, phone, email, customer_id")
      .limit(40);

    if (customer.id) {
      bookingQuery = bookingQuery.eq("customer_id", customer.id);
    }

    let { data: bookings, error } = await bookingQuery;

    if (error || !bookings?.length) {
      const orParts: string[] = [];
      if (customer.phone?.trim()) {
        const p = customer.phone.trim().replace(/,/g, "");
        orParts.push(`phone.eq.${p}`);
      }
      if (customer.email?.trim()) {
        const e = customer.email.trim().replace(/"/g, "");
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

  return [...keySet];
}

/** In-app notifications for the signed-in customer (profile + linked bookings). */
export async function GET() {
  const auth = await requireCustomerApi();
  if (auth.error) return auth.error;

  const keys = await resolveAccountNotificationKeys(auth.customer);
  const notifications = await listInAppNotifications({
    customerKeys: keys,
    limit: 40,
  });

  const seen = new Set<string>();
  const deduped = notifications.filter((n) => {
    const sig = `${n.title_ar}|${n.order_status}|${n.href ?? ""}|${n.body_ar.slice(0, 80)}`;
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });

  return NextResponse.json({ notifications: deduped });
}

export async function DELETE(request: Request) {
  const auth = await requireCustomerApi();
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    ids?: string[];
    clearAll?: boolean;
  };

  const ids = [
    ...(body.ids ?? []),
    ...(body.id ? [body.id] : []),
  ].filter(Boolean);

  if (!body.clearAll && ids.length === 0) {
    return NextResponse.json({ error: "معرّف الإشعار مطلوب" }, { status: 400 });
  }

  const keys = await resolveAccountNotificationKeys(auth.customer);
  const ok = await clearInAppNotifications({
    ids,
    clearAll: Boolean(body.clearAll),
    customerKeys: keys,
  });
  if (!ok) {
    return NextResponse.json({ error: "تعذّر مسح الإشعار" }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
