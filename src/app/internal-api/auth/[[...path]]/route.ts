import { dispatchApiRequest, type ApiHandlerModule } from "@/lib/api/dispatch";
import * as callback from "@/lib/api/handlers/auth/callback/route";
import * as email from "@/lib/api/handlers/auth/email/route";
import * as logout from "@/lib/api/handlers/auth/logout/route";
import * as me from "@/lib/api/handlers/auth/me/route";
import * as oauth from "@/lib/api/handlers/auth/oauth/route";
import * as otpRequest from "@/lib/api/handlers/auth/otp/request/route";
import * as otpVerify from "@/lib/api/handlers/auth/otp/verify/route";
import * as whatsappSend from "@/lib/api/handlers/auth/whatsapp/send-code/route";
import * as whatsappVerify from "@/lib/api/handlers/auth/whatsapp/verify-code/route";
import { type NextRequest } from "next/server";

const routes: Record<string, ApiHandlerModule> = {
  "callback": callback as ApiHandlerModule,
  "email": email as ApiHandlerModule,
  "logout": logout as ApiHandlerModule,
  "me": me as ApiHandlerModule,
  "oauth": oauth as ApiHandlerModule,
  "otp/request": otpRequest as ApiHandlerModule,
  "otp/verify": otpVerify as ApiHandlerModule,
  "whatsapp/send-code": whatsappSend as ApiHandlerModule,
  "whatsapp/verify-code": whatsappVerify as ApiHandlerModule,
};

async function handle(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return dispatchApiRequest(request, (await context.params).path ?? [], routes);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
