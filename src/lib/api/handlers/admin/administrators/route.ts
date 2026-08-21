import { NextRequest, NextResponse } from "next/server";
import { requireAdminManagersApi } from "@/lib/auth";
import {
  countAdministratorStats,
  createStaffAdministrator,
  isInitialOwnerBootstrapAvailable,
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
    const counts = await countAdministratorStats();
    const ownerBootstrapAvailable = await isInitialOwnerBootstrapAvailable({
      id: user!.id,
      email: user!.email,
      role,
    });

    return NextResponse.json({
      administrators,
      counts,
      actor: { id: user!.id, email: user!.email, role },
      ownerBootstrap: { available: ownerBootstrapAvailable },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "خطأ غير متوقع" },
      { status: 500 }
    );
  }
}

/** POST — create a new staff Auth user, or promote an existing account. */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError, role } = await requireAdminManagersApi();
    if (authError) return authError;

    const body = (await request.json().catch(() => ({}))) as {
      mode?: "create" | "promote";
      auth_user_id?: string;
      full_name?: string;
      email?: string;
      password?: string;
      role?: string;
    };

    const requested = (body.role || "admin").trim().toLowerCase();
    const assignRole =
      requested === "super_admin"
        ? "owner"
        : isAdminRole(requested)
          ? normalizeAdminRole(requested)
          : null;

    if (!assignRole) {
      return NextResponse.json({ error: "دور غير صالح" }, { status: 400 });
    }

    const actor = { id: user!.id, email: user!.email, role };
    const ip = clientIp(request);

    if (body.mode === "create") {
      const result = await createStaffAdministrator({
        actor,
        fullName: body.full_name || "",
        email: body.email || "",
        role: assignRole,
        password: body.password || "",
        ip,
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error, code: result.code },
          { status: result.status }
        );
      }
      return NextResponse.json({
        ok: true,
        created: true,
        message: "تمت إضافة عضو الفريق بنجاح",
        administrator: result.administrator,
      });
    }

    const targetId = (body.auth_user_id || "").trim();
    if (!targetId) {
      return NextResponse.json(
        { error: "auth_user_id مطلوب" },
        { status: 400 }
      );
    }

    const result = await promoteAdministrator({
      actor,
      targetUserId: targetId,
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
