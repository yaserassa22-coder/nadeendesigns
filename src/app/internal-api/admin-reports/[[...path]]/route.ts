import { dispatchApiRequest, type ApiHandlerModule } from "@/lib/api/dispatch";
import * as adminExport from "@/lib/api/handlers/admin/export/route";
import * as reports from "@/lib/api/handlers/admin/reports/route";
import * as reportEmail from "@/lib/api/handlers/admin/reports/email/route";
import * as reportExport from "@/lib/api/handlers/admin/reports/export/route";
import * as reportPrint from "@/lib/api/handlers/admin/reports/print/route";
import * as reportSchedules from "@/lib/api/handlers/admin/reports/schedules/route";
import * as provider from "@/lib/api/handlers/admin/shipping/providers/route";
import * as providerByCode from "@/lib/api/handlers/admin/shipping/providers/[code]/route";
import * as providerTest from "@/lib/api/handlers/admin/shipping/providers/[code]/test/route";
import * as shippingRates from "@/lib/api/handlers/admin/shipping/rates/route";
import * as shipmentAction from "@/lib/api/handlers/admin/orders/[id]/shipment/route";
import * as messageReply from "@/lib/api/handlers/admin/messages/reply/route";
import * as search from "@/lib/api/handlers/admin/search/route";
import { type NextRequest } from "next/server";

const routes: Record<string, ApiHandlerModule> = {
  "admin/export": adminExport as ApiHandlerModule,
  "admin/reports": reports as ApiHandlerModule,
  "admin/reports/email": reportEmail as ApiHandlerModule,
  "admin/reports/export": reportExport as ApiHandlerModule,
  "admin/reports/print": reportPrint as ApiHandlerModule,
  "admin/reports/schedules": reportSchedules as ApiHandlerModule,
  "admin/shipping/providers": provider as ApiHandlerModule,
  "admin/shipping/providers/[code]": providerByCode as ApiHandlerModule,
  "admin/shipping/providers/[code]/test": providerTest as ApiHandlerModule,
  "admin/shipping/rates": shippingRates as ApiHandlerModule,
  "admin/orders/[id]/shipment": shipmentAction as ApiHandlerModule,
  "admin/messages/reply": messageReply as ApiHandlerModule,
  "admin/search": search as ApiHandlerModule,
};

async function handle(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return dispatchApiRequest(request, (await context.params).path ?? [], routes);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
