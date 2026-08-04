/** Shared admin-role helpers (Edge + Node safe — no Supabase imports). */

export const ADMIN_ROLES = new Set(["admin", "owner", "manager", "staff"]);

export function isAdminRole(role?: string | null): boolean {
  if (!role) return false;
  return ADMIN_ROLES.has(role.toLowerCase());
}
