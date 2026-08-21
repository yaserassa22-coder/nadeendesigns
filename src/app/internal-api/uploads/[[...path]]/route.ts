import { dispatchApiRequest, type ApiHandlerModule } from "@/lib/api/dispatch";
import * as upload from "@/lib/api/handlers/upload/route";
import * as videoSignature from "@/lib/api/handlers/upload/video-signature/route";
import { type NextRequest } from "next/server";

const routes: Record<string, ApiHandlerModule> = {
  "upload": upload as ApiHandlerModule,
  "upload/video-signature": videoSignature as ApiHandlerModule,
};

async function handle(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return dispatchApiRequest(request, (await context.params).path ?? [], routes);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
