import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { getLifecycleCapabilities } from "@/lib/admin/permissions";

export async function GET() {
  const { user, error: authError, role } = await requireAdminApi();
  if (authError) return authError;

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
