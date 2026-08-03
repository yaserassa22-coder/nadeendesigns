/**
 * Role helpers for archive/trash.
 * Today every authenticated admin has full access.
 * Owner / Manager / Staff matrix is documented for future enforcement.
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
