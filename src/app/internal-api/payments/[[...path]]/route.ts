import { dispatchApiRequest, type ApiHandlerModule } from "@/lib/api/dispatch";
import * as payments from "@/lib/api/handlers/admin/commerce/payments/route";
import * as paymentTest from "@/lib/api/handlers/admin/commerce/payments/[id]/test/route";
import * as invoicing from "@/lib/api/handlers/admin/commerce/invoicing/route";
import * as logs from "@/lib/api/handlers/admin/commerce/logs/route";
import * as webhook from "@/lib/api/handlers/webhooks/payments/[provider]/route";
import * as invoiceRetry from "@/lib/api/handlers/cron/invoice-retry/route";
import { type NextRequest } from "next/server";

const routes: Record<string, ApiHandlerModule> = {
  "admin/commerce/payments": payments as ApiHandlerModule,
  "admin/commerce/payments/[id]/test": paymentTest as ApiHandlerModule,
  "admin/commerce/invoicing": invoicing as ApiHandlerModule,
  "admin/commerce/logs": logs as ApiHandlerModule,
  "webhooks/payments/[provider]": webhook as ApiHandlerModule,
  "cron/invoice-retry": invoiceRetry as ApiHandlerModule,
};

async function handle(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return dispatchApiRequest(request, (await context.params).path ?? [], routes);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
