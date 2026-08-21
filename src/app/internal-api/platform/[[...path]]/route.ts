import { dispatchApiRequest, type ApiHandlerModule } from "@/lib/api/dispatch";
import * as messages from "@/lib/api/handlers/messages/route";
import * as notificationsCustomer from "@/lib/api/handlers/notifications/customer/route";
import * as notificationsRetry from "@/lib/api/handlers/notifications/retry/route";
import * as notificationsSettings from "@/lib/api/handlers/notifications/settings/route";
import * as settings from "@/lib/api/handlers/settings/route";
import * as storeSettings from "@/lib/api/handlers/store-settings/route";
import * as shippingRegions from "@/lib/api/handlers/shipping-regions/route";
import * as shipments from "@/lib/api/handlers/shipments/by-token/[token]/route";
import { type NextRequest } from "next/server";

const routes: Record<string, ApiHandlerModule> = {
  "messages": messages as ApiHandlerModule,
  "notifications/customer": notificationsCustomer as ApiHandlerModule,
  "notifications/retry": notificationsRetry as ApiHandlerModule,
  "notifications/settings": notificationsSettings as ApiHandlerModule,
  "settings": settings as ApiHandlerModule,
  "store-settings": storeSettings as ApiHandlerModule,
  "shipping-regions": shippingRegions as ApiHandlerModule,
  "shipments/by-token/[token]": shipments as ApiHandlerModule,
};

async function handle(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return dispatchApiRequest(request, (await context.params).path ?? [], routes);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
