import { NextResponse } from "next/server";
import {
  listInAppNotifications,
  markAllInAppReadForOrder,
  markInAppNotificationRead,
} from "@/lib/notifications/in-app";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  const customerKey = searchParams.get("customerKey");

  if (!orderId && !customerKey) {
    return NextResponse.json(
      { error: "orderId أو customerKey مطلوب" },
      { status: 400 }
    );
  }

  const notifications = await listInAppNotifications({
    orderId,
    customerKey,
    limit: 40,
  });

  return NextResponse.json({
    notifications,
    unread: notifications.filter((n) => !n.is_read).length,
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
