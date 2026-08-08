"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/admin/lifecycle/ConfirmDialog";
import { formatDate } from "@/lib/utils";
import type { AdministratorRow } from "@/lib/admin/administrators";
import { canAssignOwnerRole } from "@/lib/admin/permissions";
import { useLocale } from "@/components/i18n/LocaleProvider";

type Candidate = {
  auth_user_id: string;
  name: string;
  email: string;
  phone: string | null;
  already_admin: boolean;
};

const STATUS_OPTIONS = [
  { value: "all", label: "الكل" },
  { value: "active", label: "نشط" },
  { value: "disabled", label: "معطّل" },
];

export function AdministratorsManager() {
  const { t, dir } = useLocale();
  const au = t.admin.administratorsUi;

  const ROLE_LABELS = useMemo(
    (): Record<string, string> => ({
      owner: au.roleOwner,
      admin: au.roleAdmin,
      manager: au.roleManager,
      staff: au.roleStaff,
    }),
    [au]
  );

  const ROLE_FILTER_OPTIONS = useMemo(
    () => [
      { value: "", label: au.roleFilterAll },
      { value: "owner", label: au.roleOwnerShort },
      { value: "admin", label: au.roleAdmin },
      { value: "manager", label: au.roleManager },
      { value: "staff", label: au.roleStaff },
    ],
    [au]
  );

  const PROMOTE_ROLE_OPTIONS = useMemo(
    () => [
      { value: "admin", label: au.rolePromoteAdmin },
      { value: "manager", label: au.rolePromoteManager },
      { value: "staff", label: au.rolePromoteStaff },
      { value: "owner", label: au.rolePromoteOwner },
    ],
    [au]
  );

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
  const [roleSavingId, setRoleSavingId] = useState<string | null>(null);

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

  async function changeRole(row: AdministratorRow, nextRole: string) {
    if (nextRole === row.role) return;
    setRoleSavingId(row.id);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/admin/administrators/${row.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_role", role: nextRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تغيير الدور");
      setInfo(data.message || "تم تحديث الدور");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل تغيير الدور");
    } finally {
      setRoleSavingId(null);
    }
  }

  const canAssignOwner = canAssignOwnerRole({
    id: "actor",
    role: actorRole,
  });
  const roleOptions = canAssignOwner
    ? PROMOTE_ROLE_OPTIONS
    : PROMOTE_ROLE_OPTIONS.filter((o) => o.value !== "owner");

  return (
    <div className="space-y-6" dir={dir}>
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
          إضافة موظف / مسؤول
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
                    <td className="px-4 py-3 min-w-[10rem]">
                      <select
                        className="w-full rounded-lg border border-beige-dark bg-white px-2 py-1.5 text-sm outline-none focus:border-gold"
                        value={row.role}
                        disabled={
                          roleSavingId === row.id ||
                          (row.role === "owner" && !canAssignOwner)
                        }
                        onChange={(e) =>
                          void changeRole(row, e.target.value)
                        }
                        aria-label={`دور ${row.name}`}
                      >
                        {roleOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                        {row.role === "owner" && !canAssignOwner ? (
                          <option value="owner">
                            {ROLE_LABELS.owner}
                          </option>
                        ) : null}
                      </select>
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
              إضافة موظف أو مسؤول
            </h2>
            <p className="text-sm text-muted">
              اختاري عميلاً مسجّلاً واخترِ الدور: موظف (قراءة)، مدير (تشغيل)،
              مسؤول، أو مالك. يمكن تغيير الدور لاحقاً من الجدول.
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
                    onClick={() => setSelectedCandidate(c)}
                    className={`block w-full rounded-lg px-3 py-2 text-right text-sm ${
                      selectedCandidate?.auth_user_id === c.auth_user_id
                        ? "bg-gold/15 text-charcoal"
                        : "hover:bg-beige/60"
                    }`}
                  >
                    <span className="font-medium">
                      {c.name || c.email || "—"}
                    </span>
                    <span className="ms-2 text-xs text-muted dir-ltr">
                      {c.email}
                    </span>
                    {c.already_admin ? (
                      <span className="ms-2 text-xs text-amber-700">
                        تحديث الدور
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
              options={roleOptions}
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
                {selectedCandidate?.already_admin
                  ? "تحديث الدور"
                  : "إضافة للفريق"}
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
