import { dispatchApiRequest, type ApiHandlerModule } from "@/lib/api/dispatch";
import * as administrators from "@/lib/api/handlers/admin/administrators/route";
import * as administratorById from "@/lib/api/handlers/admin/administrators/[id]/route";
import * as bootstrapOwner from "@/lib/api/handlers/admin/administrators/bootstrap-owner/route";
import * as candidates from "@/lib/api/handlers/admin/administrators/candidates/route";
import * as customerAuth from "@/lib/api/handlers/admin/customer-auth/settings/route";
import * as customers from "@/lib/api/handlers/admin/customers/route";
import * as customerByKey from "@/lib/api/handlers/admin/customers/[key]/route";
import * as experienceFeatures from "@/lib/api/handlers/admin/experience-features/route";
import * as experienceTemplates from "@/lib/api/handlers/admin/experience-templates/route";
import * as loginForgot from "@/lib/api/handlers/admin/login/forgot/route";
import * as me from "@/lib/api/handlers/admin/me/route";
import * as purchaseFlows from "@/lib/api/handlers/admin/purchase-flows/route";
import * as storeSettings from "@/lib/api/handlers/admin/store-settings/route";
import * as systemHealth from "@/lib/api/handlers/admin/system-health/route";
import * as backupStatus from "@/lib/api/handlers/admin/backup-status/route";
import { type NextRequest } from "next/server";

const routes: Record<string, ApiHandlerModule> = {
  "admin/administrators": administrators as ApiHandlerModule,
  "admin/administrators/[id]": administratorById as ApiHandlerModule,
  "admin/administrators/bootstrap-owner": bootstrapOwner as ApiHandlerModule,
  "admin/administrators/candidates": candidates as ApiHandlerModule,
  "admin/customer-auth/settings": customerAuth as ApiHandlerModule,
  "admin/customers": customers as ApiHandlerModule,
  "admin/customers/[key]": customerByKey as ApiHandlerModule,
  "admin/experience-features": experienceFeatures as ApiHandlerModule,
  "admin/experience-templates": experienceTemplates as ApiHandlerModule,
  "admin/login/forgot": loginForgot as ApiHandlerModule,
  "admin/me": me as ApiHandlerModule,
  "admin/purchase-flows": purchaseFlows as ApiHandlerModule,
  "admin/store-settings": storeSettings as ApiHandlerModule,
  "admin/system-health": systemHealth as ApiHandlerModule,
  "admin/backup-status": backupStatus as ApiHandlerModule,
};

async function handle(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return dispatchApiRequest(request, (await context.params).path ?? [], routes);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
