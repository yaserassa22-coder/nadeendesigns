import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/auth/roles";
import { getProfileRole } from "@/lib/customer-auth/customer";
import { getAuthenticatedUser } from "@/lib/supabase/server";

/**
 * Admin API guard — requires authenticated Supabase user WITH admin profile role.
 * Customers sharing the same Auth project must not pass this check.
 */
export async function requireAdminApi() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: "غير مصرح" }, { status: 401 }),
    };
  }

  const role = await getProfileRole(user.id);
  if (!isAdminRole(role)) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "غير مصرح — صلاحيات الإدارة مطلوبة" },
        { status: 403 }
      ),
    };
  }

  return { user, error: null };
}
