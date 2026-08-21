import { dispatchApiRequest, type ApiHandlerModule } from "@/lib/api/dispatch";
import * as orders from "@/lib/api/handlers/orders/route";
import * as orderById from "@/lib/api/handlers/orders/[id]/route";
import * as invoice from "@/lib/api/handlers/orders/[id]/invoice/route";
import * as message from "@/lib/api/handlers/orders/message/route";
import { type NextRequest } from "next/server";

const routes: Record<string, ApiHandlerModule> = {
  "orders": orders as ApiHandlerModule,
  "orders/[id]": orderById as ApiHandlerModule,
  "orders/[id]/invoice": invoice as ApiHandlerModule,
  "orders/message": message as ApiHandlerModule,
};

async function handle(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return dispatchApiRequest(request, (await context.params).path ?? [], routes);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
