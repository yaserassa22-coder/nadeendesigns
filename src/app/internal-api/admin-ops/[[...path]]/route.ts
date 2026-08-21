import { dispatchApiRequest, type ApiHandlerModule } from "@/lib/api/dispatch";
import * as appointmentsAnalytics from "@/lib/api/handlers/admin/appointments/analytics/route";
import * as consultants from "@/lib/api/handlers/admin/appointments/consultants/route";
import * as sendReminders from "@/lib/api/handlers/admin/appointments/send-reminders/route";
import * as appointmentSettings from "@/lib/api/handlers/admin/appointments/settings/route";
import * as specialDays from "@/lib/api/handlers/admin/appointments/special-days/route";
import * as appointmentWaiting from "@/lib/api/handlers/admin/appointments/waiting-list/route";
import * as bookingAction from "@/lib/api/handlers/admin/bookings/action/route";
import * as guests from "@/lib/api/handlers/admin/guests/route";
import * as dashboard from "@/lib/api/handlers/admin/dashboard/route";
import * as inboxCounts from "@/lib/api/handlers/admin/inbox-counts/route";
import * as lifecycle from "@/lib/api/handlers/admin/lifecycle/route";
import * as cleanup from "@/lib/api/handlers/admin/cleanup/route";
import * as trash from "@/lib/api/handlers/admin/trash/route";
import * as auditLogs from "@/lib/api/handlers/admin/audit-logs/route";
import * as notificationEmail from "@/lib/api/handlers/admin/notifications/email-provider/route";
import * as notificationOutbox from "@/lib/api/handlers/admin/notifications/outbox/route";
import * as notificationTest from "@/lib/api/handlers/admin/notifications/test-email/route";
import { type NextRequest } from "next/server";

const routes: Record<string, ApiHandlerModule> = {
  "admin/appointments/analytics": appointmentsAnalytics as ApiHandlerModule,
  "admin/appointments/consultants": consultants as ApiHandlerModule,
  "admin/appointments/send-reminders": sendReminders as ApiHandlerModule,
  "admin/appointments/settings": appointmentSettings as ApiHandlerModule,
  "admin/appointments/special-days": specialDays as ApiHandlerModule,
  "admin/appointments/waiting-list": appointmentWaiting as ApiHandlerModule,
  "admin/bookings/action": bookingAction as ApiHandlerModule,
  "admin/guests": guests as ApiHandlerModule,
  "admin/dashboard": dashboard as ApiHandlerModule,
  "admin/inbox-counts": inboxCounts as ApiHandlerModule,
  "admin/lifecycle": lifecycle as ApiHandlerModule,
  "admin/cleanup": cleanup as ApiHandlerModule,
  "admin/trash": trash as ApiHandlerModule,
  "admin/audit-logs": auditLogs as ApiHandlerModule,
  "admin/notifications/email-provider": notificationEmail as ApiHandlerModule,
  "admin/notifications/outbox": notificationOutbox as ApiHandlerModule,
  "admin/notifications/test-email": notificationTest as ApiHandlerModule,
};

async function handle(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return dispatchApiRequest(request, (await context.params).path ?? [], routes);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
