import { NextResponse } from "next/server";
import {
  listInAppNotifications,
  markAllInAppReadForOrder,
  markInAppNotificationRead,
} from "@/lib/notifications/in-app";
import { bookingNotificationKeys } from "@/lib/notifications/customer-keys";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  const customerKey = searchParams.get("customerKey");
  const phone = searchParams.get("phone");
  const email = searchParams.get("email");
  const keysParam = searchParams.get("keys");

  const keys = bookingNotificationKeys({
    phone,
    email,
    customerKey,
  });
  if (keysParam) {
    for (const k of keysParam.split(",")) {
      const t = k.trim();
      if (t && !keys.includes(t)) keys.push(t);
    }
  }

  if (!orderId && keys.length === 0) {
    return NextResponse.json(
      { error: "orderId أو customerKey أو phone مطلوب" },
      { status: 400 }
    );
  }

  const notifications = await listInAppNotifications({
    orderId,
    customerKeys: keys,
    limit: 40,
  });

  // Deduplicate by title+body+status within 1 minute window → keep newest id set
  const seen = new Set<string>();
  const deduped = notifications.filter((n) => {
    const sig = `${n.title_ar}|${n.order_status}|${n.href ?? ""}`;
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });

  return NextResponse.json({
    notifications: deduped,
    unread: deduped.filter((n) => !n.is_read).length,
  });
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string;
      orderId?: string;
      markAll?: boolean;
    };

    if (body.markAll && body.orderId) {
      await markAllInAppReadForOrder(body.orderId);
      return NextResponse.json({ success: true });
    }

    if (!body.id) {
      return NextResponse.json({ error: "معرّف الإشعار مطلوب" }, { status: 400 });
    }

    const ok = await markInAppNotificationRead(body.id);
    if (!ok) {
      return NextResponse.json({ error: "تعذّر تحديث الإشعار" }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "خطأ" },
      { status: 400 }
    );
  }
}
