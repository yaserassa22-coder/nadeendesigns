import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCustomerApi } from "@/lib/customer-auth/customer";
import { isMissingTableError } from "@/lib/supabase/errors";

export async function GET() {
  const auth = await requireCustomerApi();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("customer_sessions")
    .select("id, ip_address, user_agent, remember_device, last_seen_at, created_at, revoked_at")
    .eq("customer_id", auth.customer.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error && isMissingTableError(error, "customer_sessions")) {
    return NextResponse.json({ sessions: [] });
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ sessions: data ?? [] });
}
