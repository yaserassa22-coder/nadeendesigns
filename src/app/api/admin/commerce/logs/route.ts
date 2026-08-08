import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { listCommerceLogs } from "@/lib/commerce/logging";
import type { CommerceLogCategory } from "@/lib/commerce/logging";
import { processDueInvoiceJobs } from "@/lib/invoicing/service";

export async function GET(request: NextRequest) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const category = request.nextUrl.searchParams.get(
    "category"
  ) as CommerceLogCategory | null;
  const limit = Number(request.nextUrl.searchParams.get("limit") || 50);
  const logs = await listCommerceLogs({
    category: category || undefined,
    limit,
  });
  return NextResponse.json({ logs });
}

/** Process pending invoice retries */
export async function POST() {
  const { error } = await requireAdminApi("canMutateSettings");
  if (error) return error;

  const processed = await processDueInvoiceJobs(20);
  return NextResponse.json({ ok: true, processed });
}
