import { NextRequest, NextResponse } from "next/server";
import { processDueInvoiceJobs } from "@/lib/invoicing/service";

/**
 * POST /api/cron/invoice-retry
 * Secure with CRON_SECRET header: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const processed = await processDueInvoiceJobs(25);
  return NextResponse.json({ ok: true, processed });
}
