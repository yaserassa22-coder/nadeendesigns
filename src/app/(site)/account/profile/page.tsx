"use client";

import { useEffect, useState } from "react";
import { useCustomerAuth } from "@/components/auth/CustomerAuthProvider";
import { Button } from "@/components/ui/Button";

export default function AccountProfilePage() {
  const { customer, refresh } = useCustomerAuth();
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    birthday: "",
    wedding_date: "",
    preferred_language: "ar",
    photo_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [sessions, setSessions] = useState<unknown[]>([]);

  useEffect(() => {
    if (!customer) return;
    const timer = window.setTimeout(() => {
      setForm({
        full_name: customer.full_name || "",
        phone: customer.phone || "",
        email: customer.email || "",
        birthday: customer.birthday || "",
        wedding_date: customer.wedding_date || "",
        preferred_language: customer.preferred_language || "ar",
        photo_url: customer.photo_url || "",
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [customer]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetch("/api/account/sessions")
        .then((r) => r.json())
        .then((d) => setSessions(d.sessions ?? []));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحفظ");
      await refresh();
      setMsg("تم حفظ الملف");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "فشل");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-2xl border border-beige-dark bg-white p-5 sm:grid-cols-2">
        <div className="sm:col-span-2 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full border border-beige-dark bg-beige/50 px-3 py-1 text-muted">
            مزوّد الدخول:{" "}
            <strong className="text-charcoal">
              {customer?.provider || "—"}
            </strong>
          </span>
          {customer?.last_login_at && (
            <span className="rounded-full border border-beige-dark bg-beige/50 px-3 py-1 text-muted">
              آخر دخول:{" "}
              <strong className="text-charcoal" dir="ltr">
                {new Date(customer.last_login_at).toLocaleString("ar")}
              </strong>
            </span>
          )}
        </div>
        {(
          [
            ["full_name", "الاسم"],
            ["phone", "الهاتف"],
            ["email", "البريد"],
            ["photo_url", "رابط الصورة"],
            ["birthday", "تاريخ الميلاد"],
            ["wedding_date", "تاريخ الزفاف"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-sm">
            <span className="text-muted">{label}</span>
            <input
              type={
                key === "birthday" || key === "wedding_date" ? "date" : "text"
              }
              dir={key === "email" || key === "phone" || key === "photo_url" ? "ltr" : undefined}
              className="mt-1 w-full rounded-xl border border-beige-dark px-3 py-2.5 outline-none focus:border-[color:#C9A14A]"
              value={form[key]}
              onChange={(e) =>
                setForm((f) => ({ ...f, [key]: e.target.value }))
              }
            />
          </label>
        ))}
        <label className="block text-sm">
          <span className="text-muted">اللغة</span>
          <select
            className="mt-1 w-full rounded-xl border border-beige-dark px-3 py-2.5"
            value={form.preferred_language}
            onChange={(e) =>
              setForm((f) => ({ ...f, preferred_language: e.target.value }))
            }
          >
            <option value="ar">العربية</option>
            <option value="en">English</option>
            <option value="he">עברית</option>
          </select>
        </label>
      </div>
      {msg && <p className="text-sm text-muted">{msg}</p>}
      <Button
        loading={saving}
        onClick={() => void save()}
        style={{ backgroundColor: "#C9A14A" }}
      >
        حفظ
      </Button>

      <div className="rounded-2xl border border-beige-dark bg-white/80 p-5">
        <h3 className="font-medium text-charcoal">الجلسات والأجهزة</h3>
        <p className="mt-1 text-xs text-muted">
          {sessions.length} جلسة مسجّلة — استخدمي «الخروج من كل الأجهزة» من القائمة.
        </p>
      </div>
    </div>
  );
}
