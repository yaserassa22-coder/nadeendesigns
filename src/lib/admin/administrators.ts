import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseUrl } from "@/lib/supabase/env";
import { isMissingColumnError } from "@/lib/supabase/errors";
import { isAdminRole } from "@/lib/auth/roles";
import {
  canAssignOwnerRole,
  canManageTargetAdmin,
  normalizeAdminRole,
  type AdminActor,
  type AssignableAdminRole,
} from "@/lib/admin/permissions";
import { writeAuditLog } from "@/lib/admin/audit";
import { sendCustomerAuthLinkEmail } from "@/lib/customer-auth/auth-mail";

const MIN_STAFF_PASSWORD_LENGTH = 6;

export type AdminStatusFilter = "all" | "active" | "disabled";

export type AdministratorRow = {
  id: string;
  name: string;
  email: string;
  role: AssignableAdminRole;
  status: "active" | "disabled";
  last_login_at: string | null;
  created_at: string | null;
  is_self: boolean;
};

export type PromoteCandidate = {
  auth_user_id: string;
  name: string;
  email: string;
  phone: string | null;
  already_admin: boolean;
};

type ProfileRow = {
  id: string;
  role: string | null;
  full_name: string | null;
  created_at: string | null;
  is_disabled?: boolean | null;
};

function parseAssignableRole(role?: string | null): AssignableAdminRole | null {
  if (!role || !isAdminRole(role)) return null;
  return normalizeAdminRole(role);
}

function isOwnerLikeRole(role?: string | null): boolean {
  const r = (role ?? "").toLowerCase().trim();
  return r === "owner" || r === "super_admin";
}

function isExactAdminRole(role?: string | null): boolean {
  return (role ?? "").toLowerCase().trim() === "admin";
}

function normalizeEmail(value?: string | null): string {
  return (value || "").trim().toLowerCase();
}

/**
 * Pinned first-Owner identity for the one-time bootstrap.
 * Confirmed from live data (2026-08-15): Yaser / yaserassa22@gmail.com.
 * Not exported — the client only receives an eligibility flag.
 */
const INITIAL_OWNER_USER_ID = "278ac024-8f8a-49c6-83ff-97a38bf53f33";
const INITIAL_OWNER_EMAIL = "yaserassa22@gmail.com";

async function selectProfiles(
  supabase: ReturnType<typeof createAdminClient>
): Promise<{ rows: ProfileRow[]; hasDisabledCol: boolean }> {
  const withDisabled = await supabase
    .from("profiles")
    .select("id, role, full_name, created_at, is_disabled");

  if (!withDisabled.error) {
    return {
      rows: (withDisabled.data || []) as ProfileRow[],
      hasDisabledCol: true,
    };
  }

  if (isMissingColumnError(withDisabled.error, "is_disabled")) {
    const basic = await supabase
      .from("profiles")
      .select("id, role, full_name, created_at");
    if (basic.error) throw new Error(basic.error.message);
    return {
      rows: (basic.data || []) as ProfileRow[],
      hasDisabledCol: false,
    };
  }

  throw new Error(withDisabled.error.message);
}

async function enrichAuthMeta(
  ids: string[]
): Promise<
  Map<string, { email: string; last_sign_in_at: string | null }>
> {
  const map = new Map<string, { email: string; last_sign_in_at: string | null }>();
  if (ids.length === 0) return map;

  const admin = createAdminClient();
  // Prefer per-id lookup for accuracy; batch in parallel (capped).
  const chunk = ids.slice(0, 200);
  await Promise.all(
    chunk.map(async (id) => {
      const { data, error } = await admin.auth.admin.getUserById(id);
      if (error || !data.user) return;
      map.set(id, {
        email: (data.user.email || "").toLowerCase(),
        last_sign_in_at: data.user.last_sign_in_at ?? null,
      });
    })
  );
  return map;
}

async function enrichCustomers(
  authIds: string[]
): Promise<
  Map<string, { full_name: string | null; email: string | null; last_login_at: string | null }>
> {
  const map = new Map<
    string,
    { full_name: string | null; email: string | null; last_login_at: string | null }
  >();
  if (authIds.length === 0) return map;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("customers")
    .select("auth_user_id, full_name, email, last_login_at")
    .in("auth_user_id", authIds);

  if (error) {
    console.warn("[administrators] customers enrich", error.message);
    return map;
  }

  for (const row of data || []) {
    const id = row.auth_user_id as string | null;
    if (!id) continue;
    map.set(id, {
      full_name: (row.full_name as string | null) ?? null,
      email: (row.email as string | null) ?? null,
      last_login_at: (row.last_login_at as string | null) ?? null,
    });
  }
  return map;
}

/** Count currently active administrators (admin role + not disabled). */
export async function countAdministratorStats(): Promise<{
  total: number;
  active: number;
}> {
  const supabase = createAdminClient();
  const { rows, hasDisabledCol } = await selectProfiles(supabase);
  const admins = rows.filter((p) => isAdminRole(p.role));
  return {
    total: admins.length,
    active: admins.filter((p) => !(hasDisabledCol && p.is_disabled)).length,
  };
}

/** Count currently active administrators (admin role + not disabled). */
export async function countActiveAdministrators(): Promise<number> {
  const supabase = createAdminClient();
  const { rows, hasDisabledCol } = await selectProfiles(supabase);
  return rows.filter((p) => {
    if (!isAdminRole(p.role)) return false;
    if (hasDisabledCol && p.is_disabled) return false;
    return true;
  }).length;
}

export async function listAdministrators(params: {
  q?: string;
  status?: AdminStatusFilter;
  role?: string;
  actorId: string;
}): Promise<AdministratorRow[]> {
  const supabase = createAdminClient();
  const { rows, hasDisabledCol } = await selectProfiles(supabase);

  const adminProfiles = rows.filter((p) => isAdminRole(p.role));
  const ids = adminProfiles.map((p) => p.id);
  const [authMeta, customers] = await Promise.all([
    enrichAuthMeta(ids),
    enrichCustomers(ids),
  ]);

  const q = (params.q || "").trim().toLowerCase();
  const statusFilter = params.status || "all";
  const roleFilter = (params.role || "").trim().toLowerCase();

  const list: AdministratorRow[] = [];
  for (const p of adminProfiles) {
    const role = parseAssignableRole(p.role);
    if (!role) continue;

    const disabled = Boolean(hasDisabledCol && p.is_disabled);
    const status: "active" | "disabled" = disabled ? "disabled" : "active";
    const auth = authMeta.get(p.id);
    const cust = customers.get(p.id);
    const email = auth?.email || cust?.email || "";
    const name =
      (p.full_name || "").trim() ||
      (cust?.full_name || "").trim() ||
      email.split("@")[0] ||
      "—";
    const lastLogin =
      auth?.last_sign_in_at || cust?.last_login_at || null;

    if (statusFilter === "active" && status !== "active") continue;
    if (statusFilter === "disabled" && status !== "disabled") continue;
    if (roleFilter && role !== roleFilter && !(roleFilter === "super_admin" && role === "owner")) {
      continue;
    }
    if (q) {
      const hay = `${name} ${email}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }

    list.push({
      id: p.id,
      name,
      email,
      role,
      status,
      last_login_at: lastLogin,
      created_at: p.created_at,
      is_self: p.id === params.actorId,
    });
  }

  list.sort((a, b) => {
    const ta = a.created_at ? Date.parse(a.created_at) : 0;
    const tb = b.created_at ? Date.parse(b.created_at) : 0;
    return tb - ta;
  });

  return list;
}

export async function searchPromoteCandidates(
  q: string,
  limit = 20
): Promise<PromoteCandidate[]> {
  const needle = q
    .trim()
    .toLowerCase()
    .replace(/[%_,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (needle.length < 2) return [];

  const supabase = createAdminClient();
  const { rows } = await selectProfiles(supabase);
  const adminIds = new Set(
    rows.filter((p) => isAdminRole(p.role)).map((p) => p.id)
  );

  const { data: customers, error } = await supabase
    .from("customers")
    .select("auth_user_id, full_name, email, phone")
    .not("auth_user_id", "is", null)
    .or(
      `full_name.ilike.%${needle}%,email.ilike.%${needle}%,phone.ilike.%${needle}%`
    )
    .limit(limit);

  if (error) throw new Error(error.message);

  const out: PromoteCandidate[] = [];
  for (const c of customers || []) {
    const authId = c.auth_user_id as string | null;
    if (!authId) continue;
    out.push({
      auth_user_id: authId,
      name: (c.full_name as string) || "",
      email: ((c.email as string) || "").toLowerCase(),
      phone: (c.phone as string | null) ?? null,
      already_admin: adminIds.has(authId),
    });
  }

  // Also scan auth users by email when customers miss a match.
  if (out.length < limit && needle.includes("@")) {
    const { data: listed } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 50,
    });
    for (const u of listed?.users || []) {
      const email = (u.email || "").toLowerCase();
      if (!email.includes(needle)) continue;
      if (out.some((x) => x.auth_user_id === u.id)) continue;
      out.push({
        auth_user_id: u.id,
        name:
          (typeof u.user_metadata?.full_name === "string"
            ? u.user_metadata.full_name
            : "") || email.split("@")[0],
        email,
        phone: null,
        already_admin: adminIds.has(u.id),
      });
      if (out.length >= limit) break;
    }
  }

  return out.slice(0, limit);
}

export async function promoteAdministrator(params: {
  actor: AdminActor;
  targetUserId: string;
  role: AssignableAdminRole;
  ip?: string | null;
}): Promise<
  | { ok: true; duplicate: boolean; administrator: AdministratorRow }
  | { ok: false; error: string; status: number }
> {
  const targetId = params.targetUserId.trim();
  if (!targetId) {
    return { ok: false, error: "معرّف المستخدم مطلوب", status: 400 };
  }

  const nextRole = normalizeAdminRole(params.role);
  if (nextRole === "owner" && !canAssignOwnerRole(params.actor)) {
    return {
      ok: false,
      error: "فقط المالك (super_admin) يمكنه منح صلاحية المالك",
      status: 403,
    };
  }

  const supabase = createAdminClient();
  const { data: authUser, error: authErr } =
    await supabase.auth.admin.getUserById(targetId);
  if (authErr || !authUser.user) {
    return { ok: false, error: "المستخدم غير موجود في المصادقة", status: 404 };
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, role, full_name, created_at, is_disabled")
    .eq("id", targetId)
    .maybeSingle();

  const oldRole = (existing?.role as string | null) ?? null;

  if (isAdminRole(oldRole) && !canManageTargetAdmin(params.actor, oldRole)) {
    return {
      ok: false,
      error: "فقط المالك يمكنه تعديل حساب مالك آخر",
      status: 403,
    };
  }
  const wasActiveAdmin =
    isAdminRole(oldRole) && !(existing as { is_disabled?: boolean } | null)?.is_disabled;

  if (
    wasActiveAdmin &&
    normalizeAdminRole(oldRole) === nextRole &&
    !(existing as { is_disabled?: boolean } | null)?.is_disabled
  ) {
    const [row] = await listAdministrators({
      actorId: params.actor.id,
      q: authUser.user.email || "",
    });
    const match = row || {
      id: targetId,
      name: (existing?.full_name as string) || authUser.user.email || "",
      email: (authUser.user.email || "").toLowerCase(),
      role: nextRole,
      status: "active" as const,
      last_login_at: authUser.user.last_sign_in_at ?? null,
      created_at: (existing?.created_at as string) || null,
      is_self: targetId === params.actor.id,
    };
    return { ok: true, duplicate: true, administrator: match };
  }

  const cust = await enrichCustomers([targetId]);
  const fullName =
    (existing?.full_name as string | null) ||
    cust.get(targetId)?.full_name ||
    (typeof authUser.user.user_metadata?.full_name === "string"
      ? authUser.user.user_metadata.full_name
      : null) ||
    "";

  const payload: Record<string, unknown> = {
    id: targetId,
    role: nextRole === "owner" ? "owner" : nextRole,
    full_name: fullName,
    updated_at: new Date().toISOString(),
  };

  // Clear disabled on promote/re-enable path
  const upsert = await supabase.from("profiles").upsert(
    { ...payload, is_disabled: false },
    { onConflict: "id" }
  );

  if (upsert.error && isMissingColumnError(upsert.error, "is_disabled")) {
    const retry = await supabase.from("profiles").upsert(payload, {
      onConflict: "id",
    });
    if (retry.error) {
      return { ok: false, error: retry.error.message, status: 500 };
    }
  } else if (upsert.error) {
    if (isMissingColumnError(upsert.error, "updated_at")) {
      const { updated_at: _u, ...rest } = payload;
      const retry = await supabase
        .from("profiles")
        .upsert({ ...rest, is_disabled: false }, { onConflict: "id" });
      if (retry.error) {
        return { ok: false, error: retry.error.message, status: 500 };
      }
    } else {
      return { ok: false, error: upsert.error.message, status: 500 };
    }
  }

  await writeAuditLog(supabase, {
    module: "administrators",
    recordId: targetId,
    action: wasActiveAdmin ? "edit" : "promote",
    actorId: params.actor.id,
    actorEmail: params.actor.email,
    ipAddress: params.ip,
    meta: {
      actor: params.actor.email || params.actor.id,
      target: authUser.user.email || targetId,
      old_role: oldRole,
      new_role: nextRole,
      timestamp: new Date().toISOString(),
    },
  });

  const list = await listAdministrators({ actorId: params.actor.id });
  const administrator =
    list.find((a) => a.id === targetId) ||
    ({
      id: targetId,
      name: fullName || authUser.user.email || "",
      email: (authUser.user.email || "").toLowerCase(),
      role: nextRole,
      status: "active",
      last_login_at: authUser.user.last_sign_in_at ?? null,
      created_at: new Date().toISOString(),
      is_self: targetId === params.actor.id,
    } satisfies AdministratorRow);

  return { ok: true, duplicate: false, administrator };
}

export async function demoteAdministrator(params: {
  actor: AdminActor;
  targetUserId: string;
  ip?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const targetId = params.targetUserId.trim();
  if (!targetId) {
    return { ok: false, error: "معرّف المستخدم مطلوب", status: 400 };
  }
  if (targetId === params.actor.id) {
    return {
      ok: false,
      error: "لا يمكنك إزالة صلاحياتك الإدارية بنفسك",
      status: 400,
    };
  }

  const supabase = createAdminClient();
  const { data: existing, error } = await supabase
    .from("profiles")
    .select("id, role, is_disabled")
    .eq("id", targetId)
    .maybeSingle();

  if (error && !isMissingColumnError(error, "is_disabled")) {
    return { ok: false, error: error.message, status: 500 };
  }

  if (!existing || !isAdminRole(existing.role as string | null)) {
    return { ok: false, error: "هذا المستخدم ليس مسؤولاً", status: 404 };
  }

  if (!canManageTargetAdmin(params.actor, existing.role as string | null)) {
    return {
      ok: false,
      error: "فقط المالك يمكنه إزالة صلاحيات مالك آخر",
      status: 403,
    };
  }

  const activeCount = await countActiveAdministrators();
  const targetDisabled = Boolean(
    (existing as { is_disabled?: boolean }).is_disabled
  );
  if (!targetDisabled && activeCount <= 1) {
    return {
      ok: false,
      error: "لا يمكن إزالة آخر مسؤول نشط في النظام",
      status: 409,
    };
  }

  const oldRole = (existing.role as string) || null;
  const { data: authUser } = await supabase.auth.admin.getUserById(targetId);

  // Demote: strip admin role — never delete auth user or customer rows.
  const update = await supabase
    .from("profiles")
    .update({
      role: "customer",
      is_disabled: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetId);

  if (update.error) {
    if (
      isMissingColumnError(update.error, "is_disabled") ||
      isMissingColumnError(update.error, "updated_at")
    ) {
      const retry = await supabase
        .from("profiles")
        .update({ role: "customer" })
        .eq("id", targetId);
      if (retry.error) {
        return { ok: false, error: retry.error.message, status: 500 };
      }
    } else {
      return { ok: false, error: update.error.message, status: 500 };
    }
  }

  await writeAuditLog(supabase, {
    module: "administrators",
    recordId: targetId,
    action: "demote",
    actorId: params.actor.id,
    actorEmail: params.actor.email,
    ipAddress: params.ip,
    meta: {
      actor: params.actor.email || params.actor.id,
      target: authUser.user?.email || targetId,
      old_role: oldRole,
      new_role: "customer",
      timestamp: new Date().toISOString(),
    },
  });

  return { ok: true };
}

export async function setAdministratorDisabled(params: {
  actor: AdminActor;
  targetUserId: string;
  disabled: boolean;
  ip?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const targetId = params.targetUserId.trim();
  if (!targetId) {
    return { ok: false, error: "معرّف المستخدم مطلوب", status: 400 };
  }
  if (params.disabled && targetId === params.actor.id) {
    return {
      ok: false,
      error: "لا يمكنك تعطيل حسابك الإداري بنفسك",
      status: 400,
    };
  }

  const supabase = createAdminClient();
  const { data: existing, error } = await supabase
    .from("profiles")
    .select("id, role, is_disabled")
    .eq("id", targetId)
    .maybeSingle();

  if (error && isMissingColumnError(error, "is_disabled")) {
    return {
      ok: false,
      error:
        "عمود is_disabled غير موجود — نفّذي migration 044_admin_profiles_management.sql",
      status: 503,
    };
  }
  if (error) return { ok: false, error: error.message, status: 500 };
  if (!existing || !isAdminRole(existing.role as string | null)) {
    return { ok: false, error: "هذا المستخدم ليس مسؤولاً", status: 404 };
  }

  if (!canManageTargetAdmin(params.actor, existing.role as string | null)) {
    return {
      ok: false,
      error: "فقط المالك يمكنه تعطيل/تفعيل حساب مالك آخر",
      status: 403,
    };
  }

  if (params.disabled) {
    const already = Boolean(existing.is_disabled);
    if (!already) {
      const activeCount = await countActiveAdministrators();
      if (activeCount <= 1) {
        return {
          ok: false,
          error: "لا يمكن تعطيل آخر مسؤول نشط في النظام",
          status: 409,
        };
      }
    }
  }

  const oldRole = (existing.role as string) || null;
  const { data: authUser } = await supabase.auth.admin.getUserById(targetId);

  const { error: updErr } = await supabase
    .from("profiles")
    .update({
      is_disabled: params.disabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetId);

  if (updErr) return { ok: false, error: updErr.message, status: 500 };

  await writeAuditLog(supabase, {
    module: "administrators",
    recordId: targetId,
    action: params.disabled ? "disable" : "enable",
    actorId: params.actor.id,
    actorEmail: params.actor.email,
    ipAddress: params.ip,
    meta: {
      actor: params.actor.email || params.actor.id,
      target: authUser.user?.email || targetId,
      old_role: oldRole,
      new_role: oldRole,
      status: params.disabled ? "disabled" : "active",
      timestamp: new Date().toISOString(),
    },
  });

  return { ok: true };
}

async function findAuthUserByEmail(
  email: string
): Promise<{ id: string; email: string } | null> {
  const needle = email.trim().toLowerCase();
  if (!needle.includes("@")) return null;

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const base = getSupabaseUrl().replace(/\/$/, "");
  if (key && base) {
    const url = `${base}/auth/v1/admin/users?page=1&per_page=50&filter=${encodeURIComponent(needle)}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
      },
      cache: "no-store",
    });
    if (res.ok) {
      const body = (await res.json()) as {
        users?: Array<{ id?: string; email?: string | null }>;
      };
      const match = (body.users || []).find(
        (u) => (u.email || "").toLowerCase() === needle && u.id
      );
      if (match?.id) {
        return { id: match.id, email: (match.email || needle).toLowerCase() };
      }
    }
  }

  const admin = createAdminClient();
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const match = (data.users || []).find(
    (u) => (u.email || "").toLowerCase() === needle
  );
  return match
    ? { id: match.id, email: (match.email || needle).toLowerCase() }
    : null;
}

export async function createStaffAdministrator(params: {
  actor: AdminActor;
  fullName: string;
  email: string;
  role: AssignableAdminRole;
  password: string;
  ip?: string | null;
}): Promise<
  | { ok: true; administrator: AdministratorRow }
  | { ok: false; error: string; status: number; code?: "existing_account" }
> {
  const fullName = params.fullName.trim();
  const email = params.email.trim().toLowerCase();
  const password = params.password;

  if (fullName.length < 2) {
    return { ok: false, error: "الاسم الكامل مطلوب", status: 400 };
  }
  if (!email.includes("@")) {
    return { ok: false, error: "بريداً إلكترونياً صالحاً مطلوب", status: 400 };
  }
  if (password.length < MIN_STAFF_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `كلمة المرور من ${MIN_STAFF_PASSWORD_LENGTH} أحرف على الأقل`,
      status: 400,
    };
  }

  const nextRole = normalizeAdminRole(params.role);
  if (nextRole === "owner" && !canAssignOwnerRole(params.actor)) {
    return {
      ok: false,
      error: "فقط المالك (super_admin) يمكنه منح صلاحية المالك",
      status: 403,
    };
  }

  const existingAuth = await findAuthUserByEmail(email);
  if (existingAuth) {
    return {
      ok: false,
      error: "يوجد حساب بهذا البريد — استخدمي خيار الحساب الموجود",
      status: 409,
      code: "existing_account",
    };
  }

  const supabase = createAdminClient();
  const { data: created, error: createError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        is_staff: true,
      },
    });

  if (createError || !created.user) {
    const message = (createError?.message || "").toLowerCase();
    if (message.includes("already") || message.includes("registered")) {
      return {
        ok: false,
        error: "يوجد حساب بهذا البريد — استخدمي خيار الحساب الموجود",
        status: 409,
        code: "existing_account",
      };
    }
    return {
      ok: false,
      error: createError?.message || "تعذّر إنشاء حساب الموظف",
      status: 400,
    };
  }

  const promoted = await promoteAdministrator({
    actor: params.actor,
    targetUserId: created.user.id,
    role: nextRole,
    ip: params.ip,
  });

  if (!promoted.ok) {
    await supabase.auth.admin.deleteUser(created.user.id);
    return promoted;
  }

  return { ok: true, administrator: promoted.administrator };
}

export async function sendAdministratorPasswordReset(params: {
  actor: AdminActor;
  targetUserId: string;
  ip?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const targetId = params.targetUserId.trim();
  if (!targetId) {
    return { ok: false, error: "معرّف المستخدم مطلوب", status: 400 };
  }

  const supabase = createAdminClient();
  const { data: existing, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", targetId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message, status: 500 };
  if (!existing || !isAdminRole(existing.role as string | null)) {
    return { ok: false, error: "هذا المستخدم ليس مسؤولاً", status: 404 };
  }

  if (!canManageTargetAdmin(params.actor, existing.role as string | null)) {
    return {
      ok: false,
      error: "فقط المالك يمكنه إعادة تعيين كلمة مرور مالك آخر",
      status: 403,
    };
  }

  const { data: authUser, error: authErr } =
    await supabase.auth.admin.getUserById(targetId);
  const email = (authUser.user?.email || "").trim().toLowerCase();
  if (authErr || !email) {
    return {
      ok: false,
      error: "لا يوجد بريد إلكتروني مرتبط بهذا الحساب",
      status: 404,
    };
  }

  const mailed = await sendCustomerAuthLinkEmail({
    kind: "recovery",
    email,
    next: "/account/reset-password",
  });

  if (!mailed.ok) {
    return { ok: false, error: mailed.error, status: 502 };
  }
  if (!mailed.delivered) {
    return {
      ok: false,
      error: mailed.message || "تعذّر إرسال رابط إعادة التعيين",
      status: 404,
    };
  }

  await writeAuditLog(supabase, {
    module: "administrators",
    recordId: targetId,
    action: "edit",
    actorId: params.actor.id,
    actorEmail: params.actor.email,
    ipAddress: params.ip,
    meta: {
      actor: params.actor.email || params.actor.id,
      target: email,
      action: "password_reset_link",
      timestamp: new Date().toISOString(),
    },
  });

  return { ok: true };
}

async function evaluateInitialOwnerBootstrap(actor: AdminActor): Promise<
  | { available: true }
  | { available: false; reason: "owner_exists" | "identity" | "disabled" }
> {
  const supabase = createAdminClient();
  const { rows, hasDisabledCol } = await selectProfiles(supabase);

  if (rows.some((p) => isOwnerLikeRole(p.role))) {
    return { available: false, reason: "owner_exists" };
  }

  if (actor.id !== INITIAL_OWNER_USER_ID) {
    return { available: false, reason: "identity" };
  }
  if (normalizeEmail(actor.email) !== INITIAL_OWNER_EMAIL) {
    return { available: false, reason: "identity" };
  }

  const { data: authUser, error: authErr } =
    await supabase.auth.admin.getUserById(actor.id);
  if (authErr || !authUser.user) {
    return { available: false, reason: "identity" };
  }
  if (normalizeEmail(authUser.user.email) !== INITIAL_OWNER_EMAIL) {
    return { available: false, reason: "identity" };
  }

  const profile = rows.find((p) => p.id === actor.id);
  if (!profile) {
    return { available: false, reason: "identity" };
  }
  if (!isExactAdminRole(profile.role)) {
    return { available: false, reason: "identity" };
  }
  if (hasDisabledCol && profile.is_disabled) {
    return { available: false, reason: "disabled" };
  }

  return { available: true };
}

/** True only for the pinned first Owner, and only while no owner/super_admin exists. */
export async function isInitialOwnerBootstrapAvailable(
  actor: AdminActor
): Promise<boolean> {
  const result = await evaluateInitialOwnerBootstrap(actor);
  return result.available;
}

/**
 * One-time first-Owner bootstrap. Does not change the permission matrix.
 * After an owner exists, this path refuses every caller.
 */
export async function bootstrapInitialOwner(params: {
  actor: AdminActor;
  confirmed: boolean;
  ip?: string | null;
}): Promise<
  | { ok: true; administrator: AdministratorRow }
  | { ok: false; error: string; status: number }
> {
  if (params.confirmed !== true) {
    return {
      ok: false,
      error: "يلزم التأكيد الصريح لتعيين المالك الأول",
      status: 400,
    };
  }

  const eligibility = await evaluateInitialOwnerBootstrap(params.actor);
  if (!eligibility.available) {
    return {
      ok: false,
      error:
        eligibility.reason === "owner_exists"
          ? "تعيين المالك الأول لم يعد متاحاً لأن مالكاً موجوداً بالفعل"
          : "تعيين المالك الأول غير متاح لهذا الحساب",
      status: 403,
    };
  }

  const supabase = createAdminClient();
  const payload: Record<string, unknown> = {
    role: "owner",
    updated_at: new Date().toISOString(),
  };

  const applyUpdate = (body: Record<string, unknown>) =>
    supabase
      .from("profiles")
      .update(body)
      .eq("id", INITIAL_OWNER_USER_ID)
      .eq("role", "admin")
      .select("id, role")
      .maybeSingle();

  let updated = await applyUpdate(payload);
  if (updated.error && isMissingColumnError(updated.error, "updated_at")) {
    const { updated_at: _ignored, ...rest } = payload;
    updated = await applyUpdate(rest);
  }

  if (updated.error) {
    return { ok: false, error: updated.error.message, status: 500 };
  }

  const storedRole = (updated.data?.role as string | null) ?? null;
  if (!updated.data || !isOwnerLikeRole(storedRole)) {
    return {
      ok: false,
      error: "تعذر تحديث الدور — أعد المحاولة",
      status: 409,
    };
  }

  await writeAuditLog(supabase, {
    module: "administrators",
    recordId: INITIAL_OWNER_USER_ID,
    action: "promote",
    actorId: params.actor.id,
    actorEmail: params.actor.email,
    ipAddress: params.ip,
    meta: {
      bootstrap: true,
      actor: params.actor.email || params.actor.id,
      target: INITIAL_OWNER_EMAIL,
      old_role: "admin",
      new_role: "owner",
      timestamp: new Date().toISOString(),
    },
  });

  const list = await listAdministrators({ actorId: params.actor.id });
  const administrator =
    list.find((a) => a.id === INITIAL_OWNER_USER_ID) ||
    ({
      id: INITIAL_OWNER_USER_ID,
      name: params.actor.email || INITIAL_OWNER_EMAIL,
      email: INITIAL_OWNER_EMAIL,
      role: "owner",
      status: "active",
      last_login_at: null,
      created_at: null,
      is_self: true,
    } satisfies AdministratorRow);

  return { ok: true, administrator };
}
