"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/admin/lifecycle/ConfirmDialog";
import { formatDate } from "@/lib/utils";
import type { AdministratorRow } from "@/lib/admin/administrators";

type Candidate = {
  auth_user_id: string;
  name: string;
  email: string;
  phone: string | null;
  already_admin: boolean;
};

const ROLE_LABELS: Record<string, string> = {
  owner: "مالك (super_admin)",
  admin: "مسؤول",
  manager: "مدير",
  staff: "موظف",
};

const ROLE_FILTER_OPTIONS = [
  { value: "", label: "كل الأدوار" },
  { value: "owner", label: "مالك" },
  { value: "admin", label: "مسؤول" },
  { value: "manager", label: "مدير" },
  { value: "staff", label: "موظف" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "الكل" },
  { value: "active", label: "نشط" },
  { value: "disabled", label: "معطّل" },
];

const PROMOTE_ROLE_OPTIONS = [
  { value: "admin", label: "مسؤول (admin)" },
  { value: "manager", label: "مدير (manager)" },
  { value: "staff", label: "موظف (staff)" },
  { value: "owner", label: "مالك (owner / super_admin)" },
];

export function AdministratorsManager() {
  const [rows, setRows] = useState<AdministratorRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [actorRole, setActorRole] = useState<string>("admin");

  const [promoteOpen, setPromoteOpen] = useState(false);
  const [candidateQ, setCandidateQ] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null
  );
  const [promoteRole, setPromoteRole] = useState("admin");
  const [promoteLoading, setPromoteLoading] = useState(false);

  const [demoteTarget, setDemoteTarget] = useState<AdministratorRow | null>(
    null
  );
  const [demoteLoading, setDemoteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (role) params.set("role", role);
      const res = await fetch(`/api/admin/administrators?${params}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل التحميل");
      setRows(Array.isArray(data.administrators) ? data.administrators : []);
      if (data.actor?.role) setActorRole(String(data.actor.role));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, [q, status, role]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 200);
    return () => window.clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (!promoteOpen) return;
    if (candidateQ.trim().length < 2) {
      setCandidates([]);
      return;
    }
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/admin/administrators/candidates?q=${encodeURIComponent(candidateQ.trim())}`,
            { credentials: "same-origin", cache: "no-store" }
          );
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "فشل البحث");
          setCandidates(Array.isArray(data.candidates) ? data.candidates : []);
        } catch (e) {
          setError(e instanceof Error ? e.message : "فشل البحث");
        }
      })();
    }, 250);
    return () => window.clearTimeout(t);
  }, [candidateQ, promoteOpen]);

  async function promote() {
    if (!selectedCandidate) return;
    setPromoteLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/admin/administrators", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth_user_id: selectedCandidate.auth_user_id,
          role: promoteRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت الترقية");
      setInfo(data.message || "تمت الترقية");
      setPromoteOpen(false);
      setSelectedCandidate(null);
      setCandidateQ("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشلت الترقية");
    } finally {
      setPromoteLoading(false);
    }
  }

  async function confirmDemote() {
    if (!demoteTarget) return;
    setDemoteLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(
        `/api/admin/administrators/${demoteTarget.id}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت الإزالة");
      setInfo(data.message || "تم إلغاء الصلاحيات");
      setDemoteTarget(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشلت الإزالة");
    } finally {
      setDemoteLoading(false);
    }
  }

  async function toggleDisabled(row: AdministratorRow, disabled: boolean) {
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/admin/administrators/${row.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: disabled ? "disable" : "enable",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل التحديث");
      setInfo(data.message || "تم التحديث");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل التحديث");
    }
  }

  const canAssignOwner = actorRole === "owner";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="بحث (الاسم / البريد)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحثي…"
        />
        <Select
          label="الحالة"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={STATUS_OPTIONS}
        />
        <Select
          label="الدور"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          options={ROLE_FILTER_OPTIONS}
        />
        <Button loading={loading} onClick={() => void load()}>
          تحديث
        </Button>
        <Button
          onClick={() => {
            setPromoteOpen(true);
            setInfo(null);
            setError(null);
          }}
        >
          ترقية مستخدم
        </Button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      {info && (
        <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          {info}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-beige-dark bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-beige/50 text-muted">
              <tr>
                <th className="px-4 py-3 text-right">الاسم</th>
                <th className="px-4 py-3 text-right">البريد</th>
                <th className="px-4 py-3 text-right">الدور</th>
                <th className="px-4 py-3 text-right">الحالة</th>
                <th className="px-4 py-3 text-right">آخر دخول</th>
                <th className="px-4 py-3 text-right">تاريخ الإنشاء</th>
                <th className="px-4 py-3 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-muted"
                  >
                    لا يوجد مسؤولون مطابقون
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-beige-dark/60"
                  >
                    <td className="px-4 py-3 font-medium text-charcoal">
                      {row.name}
                      {row.is_self ? (
                        <span className="ms-2 text-xs text-muted">(أنتِ)</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 dir-ltr text-left">{row.email}</td>
                    <td className="px-4 py-3">
                      {ROLE_LABELS[row.role] || row.role}
                    </td>
                    <td className="px-4 py-3">
                      {row.status === "active" ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">
                          نشط
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                          معطّل
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {row.last_login_at
                        ? formatDate(row.last_login_at)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {row.created_at ? formatDate(row.created_at) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {row.status === "active" ? (
                          <Button
                            variant="outline"
                            className="!px-2 !py-1 text-xs"
                            disabled={row.is_self}
                            onClick={() => void toggleDisabled(row, true)}
                          >
                            تعطيل
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            className="!px-2 !py-1 text-xs"
                            onClick={() => void toggleDisabled(row, false)}
                          >
                            تفعيل
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          className="!px-2 !py-1 text-xs text-red-700"
                          disabled={row.is_self}
                          onClick={() => setDemoteTarget(row)}
                        >
                          إزالة صلاحيات
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {promoteOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-charcoal/40"
            aria-label="إغلاق"
            onClick={() => setPromoteOpen(false)}
          />
          <div className="relative w-full max-w-lg space-y-4 rounded-2xl border border-beige-dark bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-charcoal">
              ترقية مستخدم إلى مسؤول
            </h2>
            <p className="text-sm text-muted">
              اختاري عميلاً مسجّلاً (لديه حساب دخول). سيتم إنشاء/تحديث ملف
              profiles مع الدور المحدد.
            </p>
            <Input
              label="بحث عن عميل"
              value={candidateQ}
              onChange={(e) => {
                setCandidateQ(e.target.value);
                setSelectedCandidate(null);
              }}
              placeholder="الاسم أو البريد…"
            />
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-beige-dark/70 p-2">
              {candidates.length === 0 ? (
                <p className="p-2 text-xs text-muted">
                  ابدئي بالكتابة للبحث عن عملاء مسجّلين
                </p>
              ) : (
                candidates.map((c) => (
                  <button
                    key={c.auth_user_id}
                    type="button"
                    disabled={c.already_admin}
                    onClick={() => setSelectedCandidate(c)}
                    className={`block w-full rounded-lg px-3 py-2 text-right text-sm ${
                      selectedCandidate?.auth_user_id === c.auth_user_id
                        ? "bg-gold/15 text-charcoal"
                        : "hover:bg-beige/60"
                    } ${c.already_admin ? "opacity-50" : ""}`}
                  >
                    <span className="font-medium">
                      {c.name || c.email || "—"}
                    </span>
                    <span className="ms-2 text-xs text-muted dir-ltr">
                      {c.email}
                    </span>
                    {c.already_admin ? (
                      <span className="ms-2 text-xs text-amber-700">
                        مسؤول حالياً
                      </span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
            <Select
              label="الدور"
              value={promoteRole}
              onChange={(e) => setPromoteRole(e.target.value)}
              options={
                canAssignOwner
                  ? PROMOTE_ROLE_OPTIONS
                  : PROMOTE_ROLE_OPTIONS.filter((o) => o.value !== "owner")
              }
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setPromoteOpen(false)}
                disabled={promoteLoading}
              >
                إلغاء
              </Button>
              <Button
                loading={promoteLoading}
                disabled={!selectedCandidate}
                onClick={() => void promote()}
              >
                ترقية
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(demoteTarget)}
        title="إلغاء صلاحيات الإدارة؟"
        description={
          demoteTarget
            ? `سيتم إلغاء وصول «${demoteTarget.name || demoteTarget.email}» إلى لوحة الإدارة. بيانات العميل والطلبات تبقى محفوظة — لن يُحذف الحساب.`
            : undefined
        }
        confirmLabel="إلغاء الصلاحيات"
        danger
        loading={demoteLoading}
        onConfirm={() => void confirmDemote()}
        onCancel={() => setDemoteTarget(null)}
      />
    </div>
  );
}
