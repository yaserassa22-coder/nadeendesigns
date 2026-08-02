import { NextResponse, after } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { sendCustomCustomerMessage } from "@/lib/notifications/service";
import type { ShopOrder } from "@/types/shop";

const memoryOrders: ShopOrder[] = [];

export async function POST(request: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  try {
    const body = (await request.json()) as {
      id?: string;
      message?: string;
      channels?: "whatsapp" | "email" | "both";
    };

    if (!body.id || !body.message?.trim()) {
      return NextResponse.json(
        { error: "معرّف الطلب ونص الرسالة مطلوبان" },
        { status: 400 }
      );
    }

    const channels = body.channels || "both";
    if (!["whatsapp", "email", "both"].includes(channels)) {
      return NextResponse.json({ error: "قناة الإرسال غير صالحة" }, { status: 400 });
    }

    let order: ShopOrder | null = null;

    if (!isSupabaseConfigured()) {
      order = memoryOrders.find((o) => o.id === body.id) ?? null;
    } else {
      const supabase = await createPrivilegedClient();
      const { data, error } = await supabase
        .from("shop_orders")
        .select("*")
        .eq("id", body.id)
        .maybeSingle();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      order = (data as ShopOrder) ?? null;
    }

    if (!order) {
      // Fallback: try admin client
      if (isSupabaseConfigured()) {
        const { data } = await createAdminClient()
          .from("shop_orders")
          .select("*")
          .eq("id", body.id)
          .maybeSingle();
        order = (data as ShopOrder) ?? null;
      }
    }

    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    const message = body.message.trim();
    const target = order;

    try {
      after(async () => {
        await sendCustomCustomerMessage(target, message, channels);
      });
    } catch {
      void sendCustomCustomerMessage(target, message, channels);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "فشل إرسال الرسالة" },
      { status: 400 }
    );
  }
}
