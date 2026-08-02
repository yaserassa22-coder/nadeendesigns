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
  if (code === "42703" || /column .* does not exist/i.test(raw)) {
    if (!column) return true;
    return new RegExp(column, "i").test(raw);
  }
  // PostgREST schema cache
  if (column && new RegExp(`Could not find the .*column.*${column}`, "i").test(raw)) {
    return true;
  }
  return false;
}
