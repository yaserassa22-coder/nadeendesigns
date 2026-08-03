import {
  isMissingColumnError,
  isMissingTableError,
} from "@/lib/supabase/errors";
import type { ListVisibility } from "@/lib/admin/lifecycle-types";
import { filterRowsByVisibility } from "@/lib/admin/lifecycle";

type QueryLike = {
  eq: (column: string, value: unknown) => QueryLike;
  is: (column: string, value: null) => QueryLike;
  not: (column: string, op: string, value: null) => QueryLike;
  then?: unknown;
};

/**
 * Apply lifecycle visibility on a supabase query builder.
 * Callers should catch missing-column errors and retry without filters.
 */
export function applyLifecycleToQuery<T extends QueryLike>(
  query: T,
  visibility: ListVisibility = "active"
): T {
  if (visibility === "all") return query;
  if (visibility === "deleted") {
    return query.eq("is_deleted", true) as T;
  }
  let q = query.eq("is_deleted", false) as T;
  if (visibility === "active") {
    q = q.is("archived_at", null) as T;
  } else if (visibility === "archived") {
    q = q.not("archived_at", "is", null) as T;
  }
  return q;
}

export function isLifecycleSchemaError(error: unknown): boolean {
  if (!error) return false;
  if (isMissingColumnError(error)) return true;
  if (isMissingTableError(error)) return true;
  const msg =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: string }).message ?? "")
      : "";
  return /is_deleted|archived_at|deleted_at/i.test(msg);
}

/** Client/server fallback when columns are absent on some rows. */
export function filterLifecycleRows<T>(
  rows: T[],
  visibility: ListVisibility = "active"
): T[] {
  const typed = rows as Array<
    T & { is_deleted?: boolean | null; archived_at?: string | null }
  >;
  // If no lifecycle fields present, treat everything as active.
  const hasLifecycle = typed.some(
    (r) => "is_deleted" in (r as object) || "archived_at" in (r as object)
  );
  if (!hasLifecycle) {
    return visibility === "deleted" || visibility === "archived" ? [] : rows;
  }
  return filterRowsByVisibility(typed, visibility) as T[];
}
