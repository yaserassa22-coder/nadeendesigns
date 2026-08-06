/**
 * Role helpers for archive/trash, reports, and appointments.
 *
 * Matrix:
 * - Owner: full (archive, restore, soft/permanent delete, force conflict override)
 * - Admin: archive / restore / soft+permanent delete (same as today for role=admin)
 * - Manager: archive only (no soft delete / restore / permanent / empty trash)
 * - Staff: read-only (no lifecycle mutations)
 *
 * Unknown role → admin (does not lock out current production admins).
 */

export type AdminRole = "owner" | "admin" | "manager" | "staff";

/** Assignable administrator roles (super_admin stored/normalized as owner). */
export type AssignableAdminRole = AdminRole;

export interface AdminActor {
  id: string;
  email?: string | null;
  role?: string | null;
}

/** Normalize DB role; unknown → admin (current production behavior). */
export function normalizeAdminRole(role?: string | null): AdminRole {
  const r = (role ?? "admin").toLowerCase();
  if (r === "super_admin" || r === "owner") return "owner";
  if (r === "admin" || r === "manager" || r === "staff") {
    return r;
  }
  return "admin";
}

/**
 * Who may open Administrator Management (promote / demote / disable).
 * Requirement: super_admin / admin — `owner` is the in-app super_admin equivalent.
 */
export function canManageAdministrators(actor: AdminActor): boolean {
  const role = normalizeAdminRole(actor.role);
  return role === "owner" || role === "admin";
}

/** Only owner (super_admin) may grant or keep the owner role. */
export function canAssignOwnerRole(actor: AdminActor): boolean {
  return normalizeAdminRole(actor.role) === "owner";
}

export function canArchive(actor: AdminActor): boolean {
  const role = normalizeAdminRole(actor.role);
  return role === "owner" || role === "admin" || role === "manager";
}

export function canRestore(actor: AdminActor): boolean {
  const role = normalizeAdminRole(actor.role);
  return role === "owner" || role === "admin";
}

export function canSoftDelete(actor: AdminActor): boolean {
  const role = normalizeAdminRole(actor.role);
  return role === "owner" || role === "admin";
}

export function canPermanentDelete(actor: AdminActor): boolean {
  const role = normalizeAdminRole(actor.role);
  return role === "owner" || role === "admin";
}

export function canEmptyTrash(actor: AdminActor): boolean {
  return canPermanentDelete(actor);
}

/** Owner override for appointment conflicts. */
export function canForceAppointmentOverride(actor: AdminActor): boolean {
  return normalizeAdminRole(actor.role) === "owner";
}

/** Owner / Admin / Manager / Staff — all may open Report Center. */
export function canViewReports(actor: AdminActor): boolean {
  void actor;
  return true;
}

/**
 * Financial reports & financial export.
 * Staff: blocked. Owner / Admin / Manager: allowed.
 */
export function canViewFinancialReports(actor: AdminActor): boolean {
  const role = normalizeAdminRole(actor.role);
  return role !== "staff";
}

export function canExportFinancialReports(actor: AdminActor): boolean {
  return canViewFinancialReports(actor);
}

/** Schedule CRUD — Owner / Admin; Manager may manage today; Staff blocked. */
export function canManageReportSchedules(actor: AdminActor): boolean {
  const role = normalizeAdminRole(actor.role);
  return role === "owner" || role === "admin" || role === "manager";
}

export type LifecycleCapabilities = {
  canArchive: boolean;
  canRestore: boolean;
  canSoftDelete: boolean;
  canPermanentDelete: boolean;
  canEmptyTrash: boolean;
  canForceOverride: boolean;
  role: AdminRole;
};

export function getLifecycleCapabilities(actor: AdminActor): LifecycleCapabilities {
  return {
    canArchive: canArchive(actor),
    canRestore: canRestore(actor),
    canSoftDelete: canSoftDelete(actor),
    canPermanentDelete: canPermanentDelete(actor),
    canEmptyTrash: canEmptyTrash(actor),
    canForceOverride: canForceAppointmentOverride(actor),
    role: normalizeAdminRole(actor.role),
  };
}
