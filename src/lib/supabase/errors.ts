/** Map common PostgREST / Postgres errors to Arabic messages. */

export function getErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code?: string }).code ?? "");
  }
  return "";
}

export function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: string }).message ?? "");
  }
  if (error instanceof Error) return error.message;
  return String(error ?? "");
}

export function isMissingTableError(error: unknown, table?: string): boolean {
  const code = getErrorCode(error);
  const raw = getErrorMessage(error);
  if (code === "PGRST205") return true;
  if (table) {
    const re = new RegExp(
      `(Could not find the table .*${table}|relation ["']?${table}["']? does not exist)`,
      "i"
    );
    if (re.test(raw)) return true;
  }
  return /Could not find the table/i.test(raw);
}

export function missingShopSchemaMessage(): string {
  return "جداول المتجر غير موجودة في Supabase. افتحي SQL Editor ونفّذي ملف supabase/APPLY_SHOP_CHECKOUT.sql ثم أعيدي المحاولة.";
}

export function isMissingColumnError(error: unknown, column?: string): boolean {
  const code = getErrorCode(error);
  const raw = getErrorMessage(error);
  const missing =
    code === "42703" ||
    code === "PGRST204" ||
    /column .* does not exist/i.test(raw) ||
    /Could not find the .*column/i.test(raw);
  if (!missing) return false;
  if (!column) return true;
  return new RegExp(column, "i").test(raw);
}

/**
 * Soft-delete / archive schema not applied yet (missing is_deleted, archived_at, …).
 * Callers typically retry the query without lifecycle filters.
 */
export function isLifecycleSchemaError(error: unknown): boolean {
  if (!error) return false;
  if (isMissingColumnError(error)) return true;
  if (isMissingTableError(error)) return true;
  const msg = getErrorMessage(error);
  return /is_deleted|archived_at|deleted_at/i.test(msg);
}

/** Postgres CHECK constraint violation (23514). */
export function isCheckConstraintError(error: unknown): boolean {
  const code = getErrorCode(error);
  const raw = getErrorMessage(error);
  return code === "23514" || /check constraint/i.test(raw);
}

/**
 * True when the failing CHECK is shop_orders_status_check
 * (stale workflow statuses — needs APPLY_NOTIFICATIONS / APPLY_MISSING).
 */
export function isShopOrdersStatusCheckError(error: unknown): boolean {
  if (!isCheckConstraintError(error)) return false;
  return /shop_orders_status_check/i.test(getErrorMessage(error));
}
