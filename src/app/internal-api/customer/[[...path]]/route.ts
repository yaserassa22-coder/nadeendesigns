import { dispatchApiRequest, type ApiHandlerModule } from "@/lib/api/dispatch";
import * as addresses from "@/lib/api/handlers/account/addresses/route";
import * as appointments from "@/lib/api/handlers/account/appointments/route";
import * as designs from "@/lib/api/handlers/account/designs/route";
import * as messages from "@/lib/api/handlers/account/messages/route";
import * as notifications from "@/lib/api/handlers/account/notifications/route";
import * as orders from "@/lib/api/handlers/account/orders/route";
import * as profile from "@/lib/api/handlers/account/profile/route";
import * as reviews from "@/lib/api/handlers/account/reviews/route";
import * as sessions from "@/lib/api/handlers/account/sessions/route";
import * as wishlist from "@/lib/api/handlers/account/wishlist/route";
import * as guestCart from "@/lib/api/handlers/guest/cart/route";
import * as guestRecentlyViewed from "@/lib/api/handlers/guest/recently-viewed/route";
import * as guestSession from "@/lib/api/handlers/guest/session/route";
import * as guestWishlist from "@/lib/api/handlers/guest/wishlist/route";
import { type NextRequest } from "next/server";

const routes: Record<string, ApiHandlerModule> = {
  "account/addresses": addresses as ApiHandlerModule,
  "account/appointments": appointments as ApiHandlerModule,
  "account/designs": designs as ApiHandlerModule,
  "account/messages": messages as ApiHandlerModule,
  "account/notifications": notifications as ApiHandlerModule,
  "account/orders": orders as ApiHandlerModule,
  "account/profile": profile as ApiHandlerModule,
  "account/reviews": reviews as ApiHandlerModule,
  "account/sessions": sessions as ApiHandlerModule,
  "account/wishlist": wishlist as ApiHandlerModule,
  "guest/cart": guestCart as ApiHandlerModule,
  "guest/recently-viewed": guestRecentlyViewed as ApiHandlerModule,
  "guest/session": guestSession as ApiHandlerModule,
  "guest/wishlist": guestWishlist as ApiHandlerModule,
};

async function handle(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return dispatchApiRequest(request, (await context.params).path ?? [], routes);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
