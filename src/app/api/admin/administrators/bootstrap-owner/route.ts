import { NextRequest, NextResponse } from "next/server";
import { requireAdminManagersApi } from "@/lib/auth";
import { bootstrapInitialOwner } from "@/lib/admin/administrators";

function clientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null
  );
}

/** POST — one-time first-Owner bootstrap. Unavailable once any owner exists. */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError, role } = await requireAdminManagersApi();
    if (authError) return authError;

    const body = (await request.json().catch(() => ({}))) as {
      confirm?: unknown;
    };

    const result = await bootstrapInitialOwner({
      actor: { id: user!.id, email: user!.email, role },
      confirmed: body.confirm === true,
      ip: clientIp(request),
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "تم تعيين المالك الأول",
      administrator: result.administrator,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
