import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCustomerApi } from "@/lib/customer-auth/customer";
import { isMissingTableError } from "@/lib/supabase/errors";
import { notifyAdminIntake } from "@/lib/notifications/service";
import { bridgeAccountMessageToInbox } from "@/lib/admin/account-message-bridge";

export async function GET() {
  const auth = await requireCustomerApi();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("customer_messages")
    .select("*")
    .eq("customer_id", auth.customer.id)
    .order("created_at", { ascending: true });

  if (error && isMissingTableError(error, "customer_messages")) {
    return NextResponse.json({
      messages: [],
      stub: true,
      note: "الرسائل مع البوتيك — جاهزة بعد ترحيل 028",
    });
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireCustomerApi();
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => ({}))) as {
    body?: string;
  };
  const text = (body.body || "").trim();
  if (!text) {
    return NextResponse.json({ error: "الرسالة فارغة" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("customer_messages")
    .insert({
      customer_id: auth.customer.id,
      sender: "customer",
      body: text,
      attachment_urls: [],
    })
    .select("*")
    .single();

  if (error) {
    if (isMissingTableError(error, "customer_messages")) {
      return NextResponse.json(
        { error: "نظام الرسائل غير جاهز بعد" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const messageId = String(data?.id ?? crypto.randomUUID());
  const customerLabel =
    auth.customer.full_name ||
    auth.customer.phone ||
    auth.customer.email ||
    auth.customer.id;
  const adminPath = `/admin/messages`;

  // Mirror into Admin Messages inbox (contact_messages) immediately.
  const bridged = await bridgeAccountMessageToInbox(supabase, {
    message: {
      id: messageId,
      customer_id: auth.customer.id,
      sender: "customer",
      body: text,
      read_at: null,
      created_at: String(data?.created_at ?? new Date().toISOString()),
    },
    customer: {
      id: auth.customer.id,
      full_name: auth.customer.full_name,
      email: auth.customer.email,
      phone: auth.customer.phone,
      customer_key: auth.customer.customer_key,
    },
  });
  if (!bridged.ok) {
    console.warn("[account/messages] inbox bridge failed", bridged.error);
  } else {
    revalidatePath("/admin/messages");
    revalidatePath("/admin");
  }

  try {
    after(() =>
      notifyAdminIntake({
        id: messageId,
        notificationType: "admin_new_account_message",
        title: "رسالة من حساب عميلة",
        headline: "رسالة جديدة من حساب العميلة",
        customerId: auth.customer.id,
        adminPath,
        lines: [
          { label: "العميلة", value: String(customerLabel) },
          { label: "الرسالة", value: text.slice(0, 500) },
        ],
      })
    );
  } catch {
    void notifyAdminIntake({
      id: messageId,
      notificationType: "admin_new_account_message",
      title: "رسالة من حساب عميلة",
      headline: "رسالة جديدة من حساب العميلة",
      customerId: auth.customer.id,
      adminPath,
      lines: [
        { label: "العميلة", value: String(customerLabel) },
        { label: "الرسالة", value: text.slice(0, 500) },
      ],
    });
  }

  return NextResponse.json({ message: data, inboxId: bridged.contactId ?? null });
}
