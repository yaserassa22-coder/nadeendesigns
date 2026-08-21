import { dispatchApiRequest, type ApiHandlerModule } from "@/lib/api/dispatch";
import * as bookings from "@/lib/api/handlers/bookings/route";
import * as availability from "@/lib/api/handlers/bookings/availability/route";
import * as contact from "@/lib/api/handlers/contact/route";
import * as waitingList from "@/lib/api/handlers/waiting-list/route";
import { type NextRequest } from "next/server";

const routes: Record<string, ApiHandlerModule> = {
  "bookings": bookings as ApiHandlerModule,
  "bookings/availability": availability as ApiHandlerModule,
  "contact": contact as ApiHandlerModule,
  "waiting-list": waitingList as ApiHandlerModule,
};

async function handle(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return dispatchApiRequest(request, (await context.params).path ?? [], routes);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
