"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const ACCENT = "#C9A14A";

/**
 * Set a new password after clicking the recovery email link.
 * Session is established by /api/auth/callback before arriving here.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    if (password.length < 6) {
      setError("كلمة المرور من 6 أحرف على الأقل");
      return;
    }
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين");
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
      if (!res.ok) throw new Error(data.error || "فشل التحديث");
      setDone(true);
      window.setTimeout(() => router.replace("/account"), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل التحديث");
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
          إعادة تعيين كلمة المرور
        </h2>
        <p className="mt-1 text-sm text-muted">
          اختاري كلمة مرور جديدة لحسابكِ.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {done && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          تم تحديث كلمة المرور — جارٍ نقلكِ إلى حسابكِ…
        </div>
      )}

      {!done && (
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">
              كلمة المرور الجديدة
            </span>
            <input
              type="password"
              dir="ltr"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-beige-dark bg-white px-4 py-3 text-sm outline-none focus:border-[color:#C9A14A] focus:ring-2 focus:ring-[color:#C9A14A]/30"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">
              تأكيد كلمة المرور
            </span>
            <input
              type="password"
              dir="ltr"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-xl border border-beige-dark bg-white px-4 py-3 text-sm outline-none focus:border-[color:#C9A14A] focus:ring-2 focus:ring-[color:#C9A14A]/30"
            />
          </label>
          <Button
            type="button"
            className="w-full"
            loading={loading}
            style={{ backgroundColor: ACCENT }}
            onClick={() => void submit()}
          >
            حفظ كلمة المرور
          </Button>
        </div>
      )}
    </div>
  );
}
