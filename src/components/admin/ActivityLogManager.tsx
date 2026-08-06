"use client";

import { useCallback, useEffect, useState } from "react";
import { MODULE_LABEL_AR, type LifecycleModule } from "@/lib/admin/lifecycle-types";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { formatDate } from "@/lib/utils";

type AuditRow = {
  id: string;
  module: string;
  record_id: string;
  action: string;
  actor_email?: string | null;
  meta?: Record<string, unknown>;
  created_at: string;
};

const ACTION_LABELS: Record<string, string> = {
  archive: "أرشفة",
  unarchive: "إلغاء أرشفة",
  soft_delete: "نقل للسلة",
  restore: "استعادة",
  permanent_delete: "حذف نهائي",
  create: "إنشاء",
  edit: "تعديل",
  force_override: "تجاوز تعارض",
  appointment_status: "حالة موعد",
  report_generated: "تقرير",
  report_exported: "تصدير تقرير",
  report_printed: "طباعة تقرير",
  report_emailed: "إرسال تقرير",
  promote: "ترقية مسؤول",
  demote: "إزالة صلاحيات",
  disable: "تعطيل مسؤول",
  enable: "تفعيل مسؤول",
};

const MODULE_OPTIONS = [
  { value: "", label: "كل الوحدات" },
  ...Object.entries(MODULE_LABEL_AR).map(([value, label]) => ({
    value,
    label,
  })),
];

export function ActivityLogManager() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [module, setModule] = useState("");
  const [recordId, setRecordId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (module) params.set("module", module);
      if (recordId.trim()) params.set("recordId", recordId.trim());
      const res = await fetch(`/api/admin/audit-logs?${params}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل التحميل");
      setLogs(Array.isArray(data.logs) ? data.logs : []);
      setWarning(data.warning || null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, [module, recordId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <Select
          label="الوحدة"
          value={module}
          onChange={(e) => setModule(e.target.value)}
          options={MODULE_OPTIONS}
        />
        <Input
          label="معرّف السجل"
          value={recordId}
          onChange={(e) => setRecordId(e.target.value)}
          placeholder="اختياري"
          dir="ltr"
        />
        <Button loading={loading} onClick={() => void load()}>
          تحديث
        </Button>
      </div>

      {warning && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          {warning}
        </p>
      )}
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}

      <div className="overflow-hidden rounded-2xl border border-beige-dark bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-beige/50 text-muted">
              <tr>
                <th className="px-4 py-3 text-right">الوقت</th>
                <th className="px-4 py-3 text-right">الإجراء</th>
                <th className="px-4 py-3 text-right">الوحدة</th>
                <th className="px-4 py-3 text-right">السجل</th>
                <th className="px-4 py-3 text-right">المنفّذ</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">
                    {loading ? "جاري التحميل..." : "لا سجلات"}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-t border-beige-dark">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {ACTION_LABELS[log.action] || log.action}
                    </td>
                    <td className="px-4 py-3">
                      {MODULE_LABEL_AR[log.module as LifecycleModule] ||
                        log.module}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" dir="ltr">
                      {log.record_id}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {log.actor_email || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
