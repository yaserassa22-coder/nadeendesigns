"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SITE_NAME } from "@/lib/constants";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/admin";
  const configError = searchParams.get("error") === "config";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    configError
      ? "Supabase غير مُعد. تحققي من متغيرات البيئة."
      : ""
  );
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isSupabaseConfigured()) {
      setError("Supabase غير مُعد. أضيفي NEXT_PUBLIC_SUPABASE_URL والمفتاح.");
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
      router.push(redirect);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "فشل تسجيل الدخول. تحققي من البيانات."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-beige-dark bg-white p-8 shadow-xl shadow-gold/5">
      <div className="mb-8 text-center">
        <p className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold tracking-widest text-gold">
          {SITE_NAME}
        </p>
        <h1 className="mt-3 text-xl font-semibold text-charcoal">
          تسجيل دخول الإدارة
        </h1>
        <p className="mt-2 text-sm text-muted">
          أدخلي بيانات حساب Supabase للوصول إلى اللوحة
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <Input
          label="البريد الإلكتروني"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          dir="ltr"
          autoComplete="email"
          placeholder="admin@nadeendesigns.com"
        />
        <Input
          label="كلمة المرور"
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
          دخول
        </Button>
      </form>
    </div>
  );
}
