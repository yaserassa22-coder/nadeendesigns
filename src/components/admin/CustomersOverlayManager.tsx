"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { ListVisibility } from "@/lib/admin/lifecycle-types";
import { filterLifecycleRows } from "@/lib/admin/query-lifecycle";
import { postLifecycle } from "@/lib/admin/lifecycle-client";
import { useAdminCapabilities } from "@/hooks/useAdminCapabilities";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/admin/lifecycle/ConfirmDialog";
import {
  RestoreButton,
  RowLifecycleActions,
} from "@/components/admin/lifecycle/RowLifecycleActions";
import { UndoSnackbar } from "@/components/admin/lifecycle/UndoSnackbar";
import { VisibilityFilter } from "@/components/admin/lifecycle/VisibilityFilter";

type CustomerRow = {
  customer_key: string;
  display_name: string;
  phone: string | null;
  email: string | null;
  archived_at?: string | null;
  is_deleted?: boolean | null;
};

export function CustomersOverlayManager() {
  const { caps } = useAdminCapabilities();
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState<ListVisibility>("active");
  const [pendingDelete, setPendingDelete] = useState<CustomerRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);
  const [lastDeletedKey, setLastDeletedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/customers", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل جلب العملاء");
      setRows((data.customers ?? []) as CustomerRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل جلب العملاء");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const visible = filterLifecycleRows(rows, visibility);
    if (!q) return visible;
    return visible.filter(
      (r) =>
        r.display_name.toLowerCase().includes(q) ||
        (r.phone ?? "").toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        r.customer_key.toLowerCase().includes(q)
    );
  }, [rows, search, visibility]);

  const confirmSoftDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const result = await postLifecycle({
        action: "soft_delete",
        module: "customers",
        id: pendingDelete.customer_key,
        display_name: pendingDelete.display_name,
        phone: pendingDelete.phone,
        email: pendingDelete.email,
      });
      if (!result.ok) {
        alert(result.error);
        return;
      }
      const key = pendingDelete.customer_key;
      setRows((prev) =>
        prev.map((r) =>
          r.customer_key === key
            ? {
                ...r,
                is_deleted: true,
                archived_at: null,
              }
            : r
        )
      );
      setLastDeletedKey(key);
      setSnack("تم نقل العميل إلى سلة المحذوفات");
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const undoSoftDelete = async () => {
    if (!lastDeletedKey) return;
    const result = await postLifecycle({
      action: "restore",
      module: "customers",
      id: lastDeletedKey,
    });
    if (!result.ok) {
      alert(result.error);
      return;
    }
    setLastDeletedKey(null);
    setSnack(null);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">👥 العملاء</h1>
          <p className="mt-1 text-sm text-muted">
            طبقة إدارة فوق مفاتيح العملاء (هاتف/بريد) — ليست CRM كاملة.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              window.location.assign("/api/admin/export?module=customers");
            }}
          >
            تصدير CSV
          </Button>
          <Button variant="outline" loading={loading} onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            تحديث
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="بحث"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="الاسم، الهاتف، البريد..."
        />
        <div>
          <p className="mb-1.5 text-sm text-muted">العرض</p>
          <VisibilityFilter value={visibility} onChange={setVisibility} />
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-beige-dark bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-beige/50 text-muted">
              <tr>
                <th className="px-4 py-3 text-right font-medium">الاسم</th>
                <th className="px-4 py-3 text-right font-medium">الهاتف</th>
                <th className="px-4 py-3 text-right font-medium">البريد</th>
                <th className="px-4 py-3 text-right font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted">
                    جاري التحميل...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted">
                    لا يوجد عملاء في الطبقة الإدارية بعد. تُنشأ السجلات عند
                    الأرشفة/الحذف.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.customer_key}
                    className="border-t border-beige-dark/60"
                  >
                    <td className="px-4 py-3 font-medium">
                      {row.display_name || "—"}
                      <p className="text-xs text-muted" dir="ltr">
                        {row.customer_key}
                      </p>
                    </td>
                    <td className="px-4 py-3" dir="ltr">
                      {row.phone || "—"}
                    </td>
                    <td className="px-4 py-3" dir="ltr">
                      {row.email || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={`/admin/customers/${encodeURIComponent(row.customer_key)}`}
                          className="rounded-lg border border-beige-dark px-2.5 py-1 text-xs hover:border-gold hover:text-gold"
                        >
                          ملف العميل
                        </a>
                        {row.is_deleted ? (
                          caps.canRestore ? (
                            <RestoreButton
                              module="customers"
                              id={row.customer_key}
                              onRestored={() => void load()}
                              onError={(msg) => alert(msg)}
                            />
                          ) : null
                        ) : (
                          <>
                            <RowLifecycleActions
                              module="customers"
                              id={row.customer_key}
                              archived={Boolean(row.archived_at)}
                              allowArchive={caps.canArchive}
                              allowRestore={caps.canRestore}
                              // Soft-delete uses confirmed "حذف" below.
                              allowSoftDelete={false}
                              onChanged={(kind) => {
                                setRows((prev) =>
                                  prev.map((r) =>
                                    r.customer_key === row.customer_key
                                      ? {
                                          ...r,
                                          archived_at:
                                            kind === "archive"
                                              ? new Date().toISOString()
                                              : null,
                                        }
                                      : r
                                  )
                                );
                              }}
                              onError={(msg) => alert(msg)}
                            />
                            {caps.canSoftDelete ? (
                              <button
                                type="button"
                                title="نقل إلى سلة المحذوفات"
                                onClick={() => setPendingDelete(row)}
                                className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
                              >
                                حذف
                              </button>
                            ) : null}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="نقل العميل إلى سلة المحذوفات؟"
        description={
          pendingDelete
            ? `سيتم إخفاء «${pendingDelete.display_name || pendingDelete.customer_key}» من قائمة العملاء النشطة. يمكن استعادته لاحقاً من سلة المحذوفات. الطلبات والحجوزات المرتبطة لا تُحذف.`
            : undefined
        }
        confirmLabel="نقل إلى السلة"
        danger
        loading={deleting}
        onConfirm={() => void confirmSoftDelete()}
        onCancel={() => setPendingDelete(null)}
      />

      <UndoSnackbar
        message={snack}
        onDismiss={() => setSnack(null)}
        onUndo={
          lastDeletedKey && caps.canRestore
            ? () => void undoSoftDelete()
            : undefined
        }
      />
    </div>
  );
}
