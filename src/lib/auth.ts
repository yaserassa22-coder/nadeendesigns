import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/auth/roles";
import { getProfileRole } from "@/lib/customer-auth/customer";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  CAPABILITY_DENIED_AR,
  canManageAdministrators,
  hasAdminCapability,
  type AdminCapability,
} from "@/lib/admin/permissions";

export type AdminApiGate = {
  user: Awaited<ReturnType<typeof getAuthenticatedUser>>;
  error: NextResponse | null;
  role: string | null;
};

/**
 * Admin API guard — requires authenticated Supabase user WITH admin profile role.
 * Optionally requires an extra capability (never trust the client role).
 */
export async function requireAdminApi(
  capability?: AdminCapability
): Promise<AdminApiGate> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: "غير مصرح" }, { status: 401 }),
      role: null,
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
      role: null,
    };
  }

  if (
    capability &&
    !hasAdminCapability(
      { id: user.id, email: user.email, role },
      capability
    )
  ) {
    return {
      user: null,
      error: NextResponse.json(
        {
          error:
            CAPABILITY_DENIED_AR[capability] ||
            "غير مصرح — صلاحية غير كافية",
        },
        { status: 403 }
      ),
      role: null,
    };
  }

  return { user, error: null, role };
}

/**
 * Administrator Management guard — owner/admin (super_admin) only.
 */
export async function requireAdminManagersApi(): Promise<AdminApiGate> {
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
        { error: CAPABILITY_DENIED_AR.canManageAdministrators },
        { status: 403 }
      ),
      role: null,
    };
  }

  return gate;
}
