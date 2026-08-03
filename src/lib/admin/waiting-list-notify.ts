/**
 * Best-effort notify first waiting customer when a booking is cancelled.
 * Does not throw — missing Twilio/Resend must not break cancel flow.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/notifications/email";
import { sendWhatsApp } from "@/lib/notifications/whatsapp";
import { isMissingTableError } from "@/lib/supabase/errors";

export async function notifyFirstWaitingCustomer(
  supabase: SupabaseClient,
  opts: {
    preferredDate?: string | null;
    consultantId?: string | null;
  }
): Promise<{ notified: boolean; waitingId?: string; error?: string }> {
  try {
    let query = supabase
      .from("waiting_list")
      .select("*")
      .eq("status", "waiting")
      .order("created_at", { ascending: true })
      .limit(1);

    if (opts.preferredDate) {
      query = query.or(
        `preferred_date.eq.${opts.preferredDate},preferred_date.is.null`
      );
    }

    const { data, error } = await query;
    if (error) {
      if (isMissingTableError(error, "waiting_list")) {
        return { notified: false, error: "waiting_list missing" };
      }
      return { notified: false, error: error.message };
    }

    const row = data?.[0] as
      | {
          id: string;
          name: string;
          phone: string;
          email?: string | null;
          notify_whatsapp?: boolean;
          notify_email?: boolean;
        }
      | undefined;

    if (!row) return { notified: false };

    const body = `مرحباً ${row.name}، توفّر موعد لدى NadEEN Designs. تواصلي معنا أو احجزي عبر الموقع قريبًا.`;

    if (row.notify_whatsapp !== false && row.phone) {
      const wa = await sendWhatsApp({ to: row.phone, body });
      if (!wa.ok) console.warn("[waiting-list] WhatsApp failed", wa.error);
    }
    if (row.notify_email !== false && row.email) {
      const em = await sendEmail({
        to: row.email,
        subject: "توفّر موعد — NadEEN Designs",
        html: `<p dir="rtl">${body}</p>`,
      });
      if (!em.ok) console.warn("[waiting-list] email failed", em.error);
    }

    await supabase
      .from("waiting_list")
      .update({
        status: "notified",
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    return { notified: true, waitingId: row.id };
  } catch (e) {
    console.warn("[waiting-list] notify failed", e);
    return {
      notified: false,
      error: e instanceof Error ? e.message : "notify failed",
    };
  }
}
