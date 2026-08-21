import { dispatchApiRequest, type ApiHandlerModule } from "@/lib/api/dispatch";
import * as accessoryItems from "@/lib/api/handlers/accessory-items/route";
import * as accessoryDuplicate from "@/lib/api/handlers/accessory-items/duplicate/route";
import * as bridalRobes from "@/lib/api/handlers/bridal-robes/route";
import * as bridalDuplicate from "@/lib/api/handlers/bridal-robes/duplicate/route";
import * as categories from "@/lib/api/handlers/categories/route";
import * as dresses from "@/lib/api/handlers/dresses/route";
import * as dressDuplicate from "@/lib/api/handlers/dresses/duplicate/route";
import * as gallery from "@/lib/api/handlers/gallery/route";
import * as galleryCategories from "@/lib/api/handlers/gallery/categories/route";
import * as veils from "@/lib/api/handlers/veils/route";
import * as veilDuplicate from "@/lib/api/handlers/veils/duplicate/route";
import * as wornByYou from "@/lib/api/handlers/worn-by-you/route";
import { type NextRequest } from "next/server";

const routes: Record<string, ApiHandlerModule> = {
  "accessory-items": accessoryItems as ApiHandlerModule,
  "accessory-items/duplicate": accessoryDuplicate as ApiHandlerModule,
  "bridal-robes": bridalRobes as ApiHandlerModule,
  "bridal-robes/duplicate": bridalDuplicate as ApiHandlerModule,
  "categories": categories as ApiHandlerModule,
  "dresses": dresses as ApiHandlerModule,
  "dresses/duplicate": dressDuplicate as ApiHandlerModule,
  "gallery": gallery as ApiHandlerModule,
  "gallery/categories": galleryCategories as ApiHandlerModule,
  "veils": veils as ApiHandlerModule,
  "veils/duplicate": veilDuplicate as ApiHandlerModule,
  "worn-by-you": wornByYou as ApiHandlerModule,
};

async function handle(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return dispatchApiRequest(request, (await context.params).path ?? [], routes);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
