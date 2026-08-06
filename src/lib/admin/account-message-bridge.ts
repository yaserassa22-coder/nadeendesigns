import type { ContactMessage } from "@/types";
import { customerKeyFromContact } from "@/lib/customer-auth/otp";
import { createAccountInAppNotification } from "@/lib/notifications/in-app";
import { isMissingColumnError, isMissingTableError } from "@/lib/supabase/errors";
import type { createPrivilegedClient } from "@/lib/supabase/privileged";

type Privileged = Awaited<ReturnType<typeof createPrivilegedClient>>;

type CustomerRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  customer_key?: string | null;
};

type AccountMsg = {
  id: string;
  customer_id: string;
  sender: string;
  body: string;
  read_at?: string | null;
  created_at: string;
};

function subjectFromBody(body: string) {
  const t = body.trim().replace(/\s+/g, " ");
  if (!t) return "رسالة من الحساب";
  return t.length > 60 ? `${t.slice(0, 57)}…` : t;
}

/** Insert Admin inbox row for one account message (idempotent via account_message_id). */
export async function bridgeAccountMessageToInbox(
  supabase: Privileged,
  params: {
    message: AccountMsg;
    customer: CustomerRow;
  }
): Promise<{ ok: boolean; contactId?: string; error?: string }> {
  const { message, customer } = params;
  const name =
    customer.full_name?.trim() ||
    customer.phone?.trim() ||
    customer.email?.trim() ||
    "عميلة";
  const email = customer.email?.trim() || "";
  const phone = customer.phone?.trim() || null;

  const row = {
    id: crypto.randomUUID(),
    name,
    email:
      email ||
      `account+${customer.id.slice(0, 8)}@customers.nadeendesigns.local`,
    phone,
    subject: subjectFromBody(message.body),
    message: message.body,
    is_read: Boolean(message.read_at) || message.sender !== "customer",
    is_deleted: false,
    archived_at: null,
    created_at: message.created_at,
    source: "account",
    customer_id: customer.id,
    account_message_id: message.id,
  };

  const existing = await supabase
    .from("contact_messages")
    .select("id")
    .eq("account_message_id", message.id)
    .maybeSingle();

  if (
    existing.error &&
    (isMissingColumnError(existing.error) ||
      /account_message_id|source|customer_id/i.test(
        existing.error.message || ""
      ))
  ) {
    // Columns not migrated — plain insert with [حساب] prefix (best-effort).
    const { data: plain, error: plainErr } = await supabase
      .from("contact_messages")
      .insert({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        subject: `[حساب] ${row.subject}`,
        message: row.message,
        is_read: row.is_read,
        created_at: row.created_at,
      })
      .select("id")
      .maybeSingle();
    if (plainErr) return { ok: false, error: plainErr.message };
    return { ok: true, contactId: plain?.id ?? row.id };
  }

  if (existing.data?.id) {
    return { ok: true, contactId: existing.data.id };
  }

  const { data, error } = await supabase
    .from("contact_messages")
    .insert(row)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") return { ok: true };
    return { ok: false, error: error.message };
  }

  return { ok: true, contactId: data?.id ?? row.id };
}

/**
 * Sync any customer→boutique account messages missing from Admin inbox.
 * Called from Admin list load so older threads appear without manual migration.
 */
export async function syncAccountMessagesIntoInbox(
  supabase: Privileged
): Promise<number> {
  const { data: msgs, error } = await supabase
    .from("customer_messages")
    .select("id, customer_id, sender, body, read_at, created_at")
    .eq("sender", "customer")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    if (isMissingTableError(error, "customer_messages")) return 0;
    console.error("[account-message-bridge] load customer_messages", error);
    return 0;
  }
  if (!msgs?.length) return 0;

  const ids = msgs.map((m) => m.id);
  const { data: existing, error: exErr } = await supabase
    .from("contact_messages")
    .select("account_message_id")
    .in("account_message_id", ids);

  const bridged = new Set<string>();
  if (!exErr && existing) {
    for (const r of existing) {
      if (r.account_message_id) bridged.add(String(r.account_message_id));
    }
  } else if (
    exErr &&
    (isMissingColumnError(exErr) || /account_message_id/i.test(exErr.message))
  ) {
    // No bridge column — fall back to subject prefix scan not reliable; bridge all via plain insert once.
    // Avoid mass duplicates: skip sync without columns (POST path still inserts [حساب] rows).
    return 0;
  }

  const pending = (msgs as AccountMsg[]).filter((m) => !bridged.has(m.id));
  if (!pending.length) return 0;

  const customerIds = [...new Set(pending.map((m) => m.customer_id))];
  const { data: customers, error: cErr } = await supabase
    .from("customers")
    .select("id, full_name, email, phone, customer_key")
    .in("id", customerIds);

  if (cErr) {
    console.error("[account-message-bridge] load customers", cErr);
    return 0;
  }

  const byId = new Map(
    (customers as CustomerRow[] | null)?.map((c) => [c.id, c]) ?? []
  );

  let synced = 0;
  for (const message of pending) {
    const customer = byId.get(message.customer_id);
    if (!customer) continue;
    const result = await bridgeAccountMessageToInbox(supabase, {
      message,
      customer,
    });
    if (result.ok) synced += 1;
  }
  return synced;
}

/** Write boutique reply into the customer account thread (+ in-app notification). */
export async function writeBoutiqueAccountReply(
  supabase: Privileged,
  params: {
    customerId: string;
    body: string;
    /**
     * When false, skip customer_notifications (caller already wrote a
     * status-specific in-app row, e.g. booking confirm). Default true.
     */
    createInApp?: boolean;
  }
): Promise<{ ok: boolean; inApp?: boolean; error?: string }> {
  const { error } = await supabase.from("customer_messages").insert({
    customer_id: params.customerId,
    sender: "boutique",
    body: params.body.trim(),
    attachment_urls: [],
  });
  if (error) {
    if (isMissingTableError(error, "customer_messages")) {
      return { ok: false, error: "جدول رسائل الحساب غير جاهز" };
    }
    return { ok: false, error: error.message };
  }

  let inApp = false;
  if (params.createInApp !== false) {
    try {
      const { data: customer } = await supabase
        .from("customers")
        .select("customer_key, phone, email")
        .eq("id", params.customerId)
        .maybeSingle();

      const key =
        (customer?.customer_key as string | null)?.trim() ||
        customerKeyFromContact(
          (customer?.phone as string | null) ?? null,
          (customer?.email as string | null) ?? null
        );

      if (key) {
        const preview = params.body.trim().slice(0, 280);
        const row = await createAccountInAppNotification({
          customerKey: key,
          title_ar: "رسالة جديدة من البوتيك",
          body_ar: preview || "لديكِ رسالة جديدة في المحادثة.",
          href: "/account/messages",
          order_status: "message",
        });
        inApp = Boolean(row);
      }
    } catch (e) {
      console.error("[account-message-bridge] in-app notify failed", e);
    }
  }

  return { ok: true, inApp };
}

export type AdminInboxMessage = ContactMessage & {
  source?: "contact" | "account" | string | null;
  customer_id?: string | null;
  account_message_id?: string | null;
  archived_at?: string | null;
  is_deleted?: boolean | null;
};
