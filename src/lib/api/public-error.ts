import { NextResponse } from "next/server";
import { getErrorCode, getErrorMessage } from "@/lib/supabase/errors";

/** True in local / preview — never expose SQL details in production. */
export function isDevApiDetailEnabled() {
  return process.env.NODE_ENV !== "production";
}

/**
 * Log the original exception and return a customer-safe Arabic message.
 * In development, include `detail` + `code` so the real DB/RLS error is visible.
 */
export function publicApiError(
  logLabel: string,
  error: unknown,
  friendlyMessage: string,
  status = 500
) {
  const code = getErrorCode(error) || undefined;
  const detail = getErrorMessage(error) || String(error ?? "");
  console.error(`[${logLabel}]`, {
    code: code ?? null,
    detail,
    error,
  });

  return NextResponse.json(
    {
      error: friendlyMessage,
      ...(isDevApiDetailEnabled()
        ? {
            detail: detail || undefined,
            code: code || undefined,
          }
        : {}),
    },
    { status }
  );
}
