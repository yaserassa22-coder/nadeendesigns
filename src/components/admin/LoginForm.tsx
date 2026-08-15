"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SITE_NAME } from "@/lib/constants";
import { useLocale } from "@/components/i18n/LocaleProvider";

export function LoginForm() {
  const { t, dir } = useLocale();
  const login = t.admin.login;
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") || "/admin";
  const redirect =
    redirectParam.startsWith("/admin") && !redirectParam.startsWith("//")
      ? redirectParam
      : "/admin";

  const errorFromQuery = (() => {
    const code = searchParams.get("error");
    if (code === "config") return login.errorConfig;
    if (code === "admin_only") return login.errorAdminOnly;
    return "";
  })();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(errorFromQuery);
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const onForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setForgotSent(false);
    if (!email.includes("@")) {
      setError(login.email);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.error || login.errorLoginFailed);
      setForgotSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : login.errorLoginFailed);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isSupabaseConfigured()) {
      setError(login.errorConfigEnv);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;

      // Confirm profiles.role before entering the dashboard (shared Auth with customers)
      const me = await fetch("/api/admin/me", { credentials: "same-origin" });
      if (!me.ok) {
        await supabase.auth.signOut();
        throw new Error(
          me.status === 403 ? login.errorNotAdmin : login.errorVerifyFailed
        );
      }

      router.push(redirect);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : login.errorLoginFailed
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="w-full max-w-md rounded-3xl border border-beige-dark bg-white p-8 shadow-xl shadow-gold/5"
      dir={dir}
    >
      <div className="mb-8 text-center">
        <p className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold tracking-widest text-gold">
          {SITE_NAME}
        </p>
        <h1 className="mt-3 text-xl font-semibold text-charcoal">
          {forgot ? login.forgotPassword : login.title}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {forgot ? login.forgotIntro : login.subtitle}
        </p>
      </div>

      {forgot ? (
        <form onSubmit={onForgot} className="space-y-5">
          <Input
            label={login.email}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            dir="ltr"
            autoComplete="email"
          />
          {error ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          ) : null}
          {forgotSent ? (
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {login.forgotSent}
            </p>
          ) : null}
          <Button type="submit" size="lg" loading={loading} className="w-full">
            {login.sendResetLink}
          </Button>
          <button
            type="button"
            className="w-full text-sm text-muted hover:text-charcoal"
            onClick={() => {
              setForgot(false);
              setForgotSent(false);
              setError("");
            }}
          >
            {login.backToLogin}
          </button>
        </form>
      ) : (
      <form onSubmit={onSubmit} className="space-y-5">
        <Input
          label={login.email}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          dir="ltr"
          autoComplete="email"
          placeholder={login.emailPlaceholder}
        />
        <Input
          label={login.password}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          dir="ltr"
          autoComplete="current-password"
          placeholder="••••••••"
        />

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" loading={loading} className="w-full">
          {login.submit}
        </Button>
        <button
          type="button"
          className="w-full text-sm text-muted hover:text-charcoal"
          onClick={() => {
            setForgot(true);
            setError("");
          }}
        >
          {login.forgotPassword}
        </button>
      </form>
      )}
    </div>
  );
}
