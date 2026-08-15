/**
 * Admin role capability matrix (server + client).
 *
 * - Owner (super_admin): full control
 * - Admin: full ops except assigning/demoting owner
 * - Manager: day-to-day store ops (catalog, orders, bookings) — no settings/admins/trash wipe
 * - Staff: read-only dashboard & lists — no mutations
 *
 * Unknown role → staff (fail closed for mutations).
 */

export type AdminRole = "owner" | "admin" | "manager" | "staff";

/** Assignable administrator roles (super_admin stored/normalized as owner). */
export type AssignableAdminRole = AdminRole;

export interface AdminActor {
  id: string;
  email?: string | null;
  role?: string | null;
}

/** Normalize DB role; missing/unknown → staff (fail closed for mutations). */
export function normalizeAdminRole(role?: string | null): AdminRole {
  const r = (role ?? "").toLowerCase().trim();
  if (r === "super_admin" || r === "owner") return "owner";
  if (r === "admin" || r === "manager" || r === "staff") {
    return r;
  }
  return "staff";
}

export type AdminCapability =
  | "canMutateStore"
  | "canMutateSettings"
  | "canManageAdministrators"
  | "canAssignOwner"
  | "canArchive"
  | "canRestore"
  | "canSoftDelete"
  | "canPermanentDelete"
  | "canEmptyTrash"
  | "canForceOverride"
  | "canViewReports"
  | "canViewFinancial"
  | "canExportFinancial"
  | "canManageReportSchedules"
  | "canUpload";

export type AdminCapabilities = Record<AdminCapability, boolean> & {
  role: AdminRole;
};

export function getAdminCapabilities(actor: AdminActor): AdminCapabilities {
  const role = normalizeAdminRole(actor.role);
  const isOwner = role === "owner";
  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isStaff = role === "staff";

  const ops = isOwner || isAdmin || isManager; // not staff
  const privileged = isOwner || isAdmin;

  return {
    role,
    canMutateStore: ops,
    canMutateSettings: privileged,
    canManageAdministrators: privileged,
    canAssignOwner: isOwner,
    canArchive: ops,
    canRestore: privileged,
    canSoftDelete: privileged,
    canPermanentDelete: privileged,
    canEmptyTrash: privileged,
    canForceOverride: isOwner,
    canViewReports: true,
    canViewFinancial: !isStaff,
    canExportFinancial: !isStaff,
    canManageReportSchedules: ops,
    canUpload: ops,
  };
}

export function hasAdminCapability(
  actor: AdminActor,
  capability: AdminCapability
): boolean {
  return Boolean(getAdminCapabilities(actor)[capability]);
}

/**
 * Who may open Administrator Management (promote / demote / disable).
 * Requirement: super_admin / admin — `owner` is the in-app super_admin equivalent.
 */
export function canManageAdministrators(actor: AdminActor): boolean {
  return hasAdminCapability(actor, "canManageAdministrators");
}

/** Only owner (super_admin) may grant or keep the owner role. */
export function canAssignOwnerRole(actor: AdminActor): boolean {
  return hasAdminCapability(actor, "canAssignOwner");
}

/** Only owner may demote/disable/change another owner. */
export function canManageTargetAdmin(
  actor: AdminActor,
  targetRole?: string | null
): boolean {
  const target = normalizeAdminRole(targetRole);
  if (target === "owner") {
    return normalizeAdminRole(actor.role) === "owner";
  }
  return canManageAdministrators(actor);
}

export function canArchive(actor: AdminActor): boolean {
  return hasAdminCapability(actor, "canArchive");
}

export function canRestore(actor: AdminActor): boolean {
  return hasAdminCapability(actor, "canRestore");
}

export function canSoftDelete(actor: AdminActor): boolean {
  return hasAdminCapability(actor, "canSoftDelete");
}

/** Plan alias — soft-delete / move to trash. */
export function canDelete(actor: AdminActor): boolean {
  return canSoftDelete(actor);
}

export function canPermanentDelete(actor: AdminActor): boolean {
  return hasAdminCapability(actor, "canPermanentDelete");
}

export function canEmptyTrash(actor: AdminActor): boolean {
  return hasAdminCapability(actor, "canEmptyTrash");
}

export function canForceAppointmentOverride(actor: AdminActor): boolean {
  return hasAdminCapability(actor, "canForceOverride");
}

export function canViewReports(actor: AdminActor): boolean {
  return hasAdminCapability(actor, "canViewReports");
}

export function canViewFinancialReports(actor: AdminActor): boolean {
  return hasAdminCapability(actor, "canViewFinancial");
}

export function canExportFinancialReports(actor: AdminActor): boolean {
  return hasAdminCapability(actor, "canExportFinancial");
}

export function canManageReportSchedules(actor: AdminActor): boolean {
  return hasAdminCapability(actor, "canManageReportSchedules");
}

export function canMutateStore(actor: AdminActor): boolean {
  return hasAdminCapability(actor, "canMutateStore");
}

export function canMutateSettings(actor: AdminActor): boolean {
  return hasAdminCapability(actor, "canMutateSettings");
}

/** @deprecated use getAdminCapabilities — kept for lifecycle UI compatibility */
export type LifecycleCapabilities = {
  canArchive: boolean;
  canRestore: boolean;
  canSoftDelete: boolean;
  canPermanentDelete: boolean;
  canEmptyTrash: boolean;
  canForceOverride: boolean;
  canMutateStore: boolean;
  canMutateSettings: boolean;
  canManageAdministrators: boolean;
  canAssignOwner: boolean;
  canUpload: boolean;
  role: AdminRole;
};

export function getLifecycleCapabilities(
  actor: AdminActor
): LifecycleCapabilities {
  const c = getAdminCapabilities(actor);
  return {
    canArchive: c.canArchive,
    canRestore: c.canRestore,
    canSoftDelete: c.canSoftDelete,
    canPermanentDelete: c.canPermanentDelete,
    canEmptyTrash: c.canEmptyTrash,
    canForceOverride: c.canForceOverride,
    canMutateStore: c.canMutateStore,
    canMutateSettings: c.canMutateSettings,
    canManageAdministrators: c.canManageAdministrators,
    canAssignOwner: c.canAssignOwner,
    canUpload: c.canUpload,
    role: c.role,
  };
}

/** Rank used only to detect a broader role assignment (not a new permission system). */
const ROLE_RANK: Record<AdminRole, number> = {
  staff: 0,
  manager: 1,
  admin: 2,
  owner: 3,
};

export type RoleAccessPreviewKey =
  | "store"
  | "settings"
  | "team"
  | "financial"
  | "reports"
  | "archive"
  | "trash"
  | "assignOwner";

export type RoleAccessPreviewItem = {
  key: RoleAccessPreviewKey;
  granted: boolean;
};

export type RoleAccessPreview = {
  role: AdminRole;
  isHighPrivilege: boolean;
  items: RoleAccessPreviewItem[];
};

/** Read-only view of the existing capability matrix for a role. */
export function getRoleAccessPreview(role: AdminRole): RoleAccessPreview {
  const c = getAdminCapabilities({ id: "preview", role });
  return {
    role,
    isHighPrivilege: c.canManageAdministrators,
    items: [
      { key: "store", granted: c.canMutateStore },
      { key: "settings", granted: c.canMutateSettings },
      { key: "team", granted: c.canManageAdministrators },
      { key: "financial", granted: c.canViewFinancial },
      { key: "reports", granted: c.canViewReports },
      { key: "archive", granted: c.canArchive },
      { key: "trash", granted: c.canEmptyTrash },
      { key: "assignOwner", granted: c.canAssignOwner },
    ],
  };
}

export function isBroaderAdminRole(
  current: string | null | undefined,
  next: string | null | undefined
): boolean {
  const from = ROLE_RANK[normalizeAdminRole(current)];
  const to = ROLE_RANK[normalizeAdminRole(next)];
  return to > from;
}

export const CAPABILITY_DENIED_AR: Record<AdminCapability, string> = {
  canMutateStore: "غير مصرح — صلاحية موظف للقراءة فقط",
  canMutateSettings: "غير مصرح — إعدادات المتجر للمالك/المسؤول فقط",
  canManageAdministrators: "غير مصرح — إدارة المسؤولين للمالك/المسؤول فقط",
  canAssignOwner: "غير مصرح — منح صلاحية المالك للمالك فقط",
  canArchive: "غير مصرح بالأرشفة",
  canRestore: "غير مصرح بالاستعادة",
  canSoftDelete: "غير مصرح بالحذف",
  canPermanentDelete: "غير مصرح بالحذف النهائي",
  canEmptyTrash: "غير مصرح بتفريغ السلة",
  canForceOverride: "غير مصرح بتجاوز تعارض المواعيد",
  canViewReports: "غير مصرح بعرض التقارير",
  canViewFinancial: "غير مصرح بالتقارير المالية",
  canExportFinancial: "غير مصرح بتصدير التقارير المالية",
  canManageReportSchedules: "غير مصرح بجداول التقارير",
  canUpload: "غير مصرح برفع الملفات",
};
