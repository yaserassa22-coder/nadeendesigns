import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { getLifecycleCapabilities } from "@/lib/admin/permissions";
import { getAdminActorRole } from "@/lib/admin/reports-data";

export async function GET() {
  const { user, error: authError } = await requireAdminApi();
  if (authError) return authError;

  const role = await getAdminActorRole(user!.id);
  const capabilities = getLifecycleCapabilities({
    id: user!.id,
    email: user!.email,
    role,
  });

  return NextResponse.json({
    id: user!.id,
    email: user!.email,
    role: capabilities.role,
    capabilities,
  });
}
