/**
 * Role helpers for archive/trash and reports.
 * Today every authenticated admin has full access (unknown role → admin).
 *
 * Documented matrix (enforced where noted):
 * - Owner: full access (archive, trash, reports including financial)
 * - Admin: full reports + financial
 * - Manager: view reports (incl. financial) — archive/restore true today
 * - Staff: may view non-financial reports; financial section + financial export blocked
 */

export type AdminRole = "owner" | "admin" | "manager" | "staff";

export interface AdminActor {
  id: string;
  email?: string | null;
  role?: string | null;
}

/** Normalize DB role; unknown → admin (current production behavior). */
export function normalizeAdminRole(role?: string | null): AdminRole {
  const r = (role ?? "admin").toLowerCase();
  if (r === "owner" || r === "admin" || r === "manager" || r === "staff") {
    return r;
  }
  return "admin";
}

export function canArchive(actor: AdminActor): boolean {
  void actor;
  // Future: staff = false
  return true;
}

export function canRestore(actor: AdminActor): boolean {
  void actor;
  // Future: staff = false; manager = true
  return true;
}

export function canSoftDelete(actor: AdminActor): boolean {
  void actor;
  // Future: manager archive-only → false for delete
  return true;
}

export function canPermanentDelete(actor: AdminActor): boolean {
  void actor;
  // Future: only owner/admin
  return true;
}

export function canEmptyTrash(actor: AdminActor): boolean {
  return canPermanentDelete(actor);
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

/** Schedule CRUD — Owner / Admin today; Manager view-only in future. */
export function canManageReportSchedules(actor: AdminActor): boolean {
  const role = normalizeAdminRole(actor.role);
  return role === "owner" || role === "admin" || role === "manager";
}
