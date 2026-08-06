import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import {
  canManageAdministrators,
  getLifecycleCapabilities,
} from "@/lib/admin/permissions";
import { getAdminActorRole } from "@/lib/admin/reports-data";

export async function GET() {
  const { user, error: authError } = await requireAdminApi();
  if (authError) return authError;

  const role = await getAdminActorRole(user!.id);
  const actor = {
    id: user!.id,
    email: user!.email,
    role,
  };
  const capabilities = getLifecycleCapabilities(actor);

  return NextResponse.json({
    id: user!.id,
    email: user!.email,
    role: capabilities.role,
    capabilities: {
      ...capabilities,
      canManageAdministrators: canManageAdministrators(actor),
    },
  });
}
