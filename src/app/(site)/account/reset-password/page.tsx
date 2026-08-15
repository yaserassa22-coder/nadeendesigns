"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const ACCENT = "#C9A14A";
const MIN_PASSWORD = 6;

/**
 * Set a new password after clicking the recovery email link.
 * Session is established by /api/auth/callback before arriving here.
 */
export default function ResetPasswordPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [linkState, setLinkState] = useState<"ok" | "invalid" | "expired">(
    "ok"
  );
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!data.user) {
          setLinkState("invalid");
        }
      } catch {
        if (!cancelled) setLinkState("invalid");
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const mismatch = confirm.length > 0 && password !== confirm;
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;
  const canSubmit =
    password.length >= MIN_PASSWORD &&
    confirm.length > 0 &&
    password === confirm &&
    !loading &&
    !done &&
    linkState === "ok";

  async function submit() {
    setError(null);
    if (password.length < MIN_PASSWORD) {
      setError(t.account.passwordMin);
      return;
    }
    if (password !== confirm) {
      setError(t.account.passwordsMismatch);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ mode: "update_password", password }),
      });
      const data = (await res.json()) as { error?: string };
      if (res.status === 401) {
        setLinkState("expired");
        throw new Error(t.account.expiredResetLink);
      }
      if (!res.ok) throw new Error(data.error || t.account.updateFailed);
      setDone(true);
      const me = await fetch("/api/admin/me", { credentials: "same-origin" });
      window.setTimeout(() => {
        router.replace(me.ok ? "/admin" : "/account");
      }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.account.updateFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-5 rounded-2xl border border-beige-dark bg-white p-6 shadow-sm">
      <div>
        <p
          className="font-[family-name:var(--font-cormorant)] text-sm tracking-[0.2em]"
          style={{ color: ACCENT }}
        >
          NadEEN Designs
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-amiri)] text-2xl text-charcoal">
          {t.account.resetPasswordTitle}
        </h2>
        <p className="mt-1 text-sm text-muted">{t.account.resetPasswordHint}</p>
      </div>

      {checking ? (
        <p className="text-sm text-muted">{t.account.resetPasswordHint}</p>
      ) : null}

      {!checking && linkState !== "ok" ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {linkState === "expired"
            ? t.account.expiredResetLink
            : t.account.invalidResetLink}
        </div>
      ) : null}

      {error && linkState === "ok" ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {done ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {t.account.passwordUpdated}
        </div>
      ) : null}

      {!checking && !done && linkState === "ok" ? (
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">
              {t.account.newPassword}
            </span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                dir="ltr"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  "w-full rounded-xl border border-beige-dark bg-white px-4 py-3 pe-12 text-sm outline-none focus:border-[color:#C9A14A] focus:ring-2 focus:ring-[color:#C9A14A]/30",
                  tooShort && "border-red-400"
                )}
              />
              <button
                type="button"
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted"
                aria-label={
                  showPassword ? t.account.hidePassword : t.account.showPassword
                }
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {tooShort ? (
              <p className="text-sm text-red-600">{t.account.passwordMin}</p>
            ) : null}
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">
              {t.account.confirmPassword}
            </span>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                dir="ltr"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={cn(
                  "w-full rounded-xl border border-beige-dark bg-white px-4 py-3 pe-12 text-sm outline-none focus:border-[color:#C9A14A] focus:ring-2 focus:ring-[color:#C9A14A]/30",
                  mismatch && "border-red-400"
                )}
              />
              <button
                type="button"
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted"
                aria-label={
                  showConfirm ? t.account.hidePassword : t.account.showPassword
                }
                onClick={() => setShowConfirm((v) => !v)}
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {mismatch ? (
              <p className="text-sm text-red-600">
                {t.account.passwordsMismatch}
              </p>
            ) : null}
          </label>
          <Button
            type="button"
            className="w-full"
            loading={loading}
            disabled={!canSubmit}
            style={{ backgroundColor: ACCENT }}
            onClick={() => void submit()}
          >
            {t.account.savePassword}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
