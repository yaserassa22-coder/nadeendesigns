import { NextRequest, NextResponse } from "next/server";
import { requireAdminManagersApi } from "@/lib/auth";
import {
  listAdministrators,
  promoteAdministrator,
  type AdminStatusFilter,
} from "@/lib/admin/administrators";
import { normalizeAdminRole } from "@/lib/admin/permissions";
import { isAdminRole } from "@/lib/auth/roles";

function clientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null
  );
}

/** GET — list administrators (search + filters). */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError, role } = await requireAdminManagersApi();
    if (authError) return authError;

    const sp = request.nextUrl.searchParams;
    const q = sp.get("q") || undefined;
    const status = (sp.get("status") || "all") as AdminStatusFilter;
    const roleFilter = sp.get("role") || undefined;

    if (status !== "all" && status !== "active" && status !== "disabled") {
      return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
    }

    const administrators = await listAdministrators({
      q,
      status,
      role: roleFilter,
      actorId: user!.id,
    });

    return NextResponse.json({
      administrators,
      actor: { id: user!.id, email: user!.email, role },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "خطأ غير متوقع" },
      { status: 500 }
    );
  }
}

/** POST — promote registered user to administrator. */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError, role } = await requireAdminManagersApi();
    if (authError) return authError;

    const body = (await request.json().catch(() => ({}))) as {
      auth_user_id?: string;
      role?: string;
    };

    const targetId = (body.auth_user_id || "").trim();
    const requested = (body.role || "admin").trim().toLowerCase();
    const assignRole =
      requested === "super_admin"
        ? "owner"
        : isAdminRole(requested)
          ? normalizeAdminRole(requested)
          : null;

    if (!targetId) {
      return NextResponse.json(
        { error: "auth_user_id مطلوب" },
        { status: 400 }
      );
    }
    if (!assignRole) {
      return NextResponse.json({ error: "دور غير صالح" }, { status: 400 });
    }

    const result = await promoteAdministrator({
      actor: { id: user!.id, email: user!.email, role },
      targetUserId: targetId,
      role: assignRole,
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
      duplicate: result.duplicate,
      message: result.duplicate
        ? "هذا المستخدم مسؤول بالفعل بنفس الدور"
        : "تم ترقية المستخدم إلى مسؤول",
      administrator: result.administrator,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
