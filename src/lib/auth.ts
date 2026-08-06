import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/auth/roles";
import { getProfileRole } from "@/lib/customer-auth/customer";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { canManageAdministrators } from "@/lib/admin/permissions";

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
      role: null as string | null,
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
      role: null as string | null,
    };
  }

  return { user, error: null, role };
}

/**
 * Administrator Management guard — owner/admin (super_admin) only.
 * Always re-reads role on the server; never trusts the client.
 */
export async function requireAdminManagersApi() {
  const gate = await requireAdminApi();
  if (gate.error || !gate.user) return gate;

  if (
    !canManageAdministrators({
      id: gate.user.id,
      email: gate.user.email,
      role: gate.role,
    })
  ) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "غير مصرح — إدارة المسؤولين للمالك/المسؤول فقط" },
        { status: 403 }
      ),
      role: null as string | null,
    };
  }

  return gate;
}
