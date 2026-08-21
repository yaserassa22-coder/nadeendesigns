import { NextRequest, NextResponse } from "next/server";
import { requireAdminManagersApi } from "@/lib/auth";
import {
  demoteAdministrator,
  promoteAdministrator,
  sendAdministratorPasswordReset,
  setAdministratorDisabled,
} from "@/lib/admin/administrators";
import { normalizeAdminRole } from "@/lib/admin/permissions";
import { isAdminRole } from "@/lib/auth/roles";

type Ctx = { params: Promise<{ id: string }> };

function clientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null
  );
}

/** PATCH — change role, disable, or enable. */
export async function PATCH(request: NextRequest, context: Ctx) {
  try {
    const { user, error: authError, role } = await requireAdminManagersApi();
    if (authError) return authError;

    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      action?: "set_role" | "disable" | "enable" | "reset_password";
      role?: string;
    };

    const actor = { id: user!.id, email: user!.email, role };
    const ip = clientIp(request);
    const action = body.action || "set_role";

    if (action === "reset_password") {
      const result = await sendAdministratorPasswordReset({
        actor,
        targetUserId: id,
        ip,
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        );
      }
      return NextResponse.json({
        ok: true,
        message: "تم إرسال رابط إعادة تعيين كلمة المرور",
      });
    }

    if (action === "disable" || action === "enable") {
      const result = await setAdministratorDisabled({
        actor,
        targetUserId: id,
        disabled: action === "disable",
        ip,
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        );
      }
      return NextResponse.json({
        ok: true,
        message:
          action === "disable"
            ? "تم تعطيل حساب المسؤول"
            : "تم تفعيل حساب المسؤول",
      });
    }

    const requested = (body.role || "").trim().toLowerCase();
    const assignRole =
      requested === "super_admin"
        ? "owner"
        : isAdminRole(requested)
          ? normalizeAdminRole(requested)
          : null;
    if (!assignRole) {
      return NextResponse.json({ error: "دور غير صالح" }, { status: 400 });
    }

    const result = await promoteAdministrator({
      actor,
      targetUserId: id,
      role: assignRole,
      ip,
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
      administrator: result.administrator,
      message: "تم تحديث دور المسؤول",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "خطأ غير متوقع" },
      { status: 500 }
    );
  }
}

/** DELETE — demote administrator (never deletes customer/auth data). */
export async function DELETE(request: NextRequest, context: Ctx) {
  try {
    const { user, error: authError, role } = await requireAdminManagersApi();
    if (authError) return authError;

    const { id } = await context.params;
    const result = await demoteAdministrator({
      actor: { id: user!.id, email: user!.email, role },
      targetUserId: id,
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
      message: "تم إلغاء صلاحيات الإدارة — بيانات العميل محفوظة",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
