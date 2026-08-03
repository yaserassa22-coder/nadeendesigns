"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import {
  MODULE_LABEL_AR,
  type LifecycleModule,
} from "@/lib/admin/lifecycle-types";
import { postTrash } from "@/lib/admin/lifecycle-client";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { BulkActionBar } from "@/components/admin/lifecycle/BulkActionBar";
import { ConfirmDialog } from "@/components/admin/lifecycle/ConfirmDialog";
import { UndoSnackbar } from "@/components/admin/lifecycle/UndoSnackbar";

type TrashItem = {
  module: LifecycleModule;
  id: string;
  title: string;
  deleted_at: string | null;
  deleted_by: string | null;
};

const MODULE_FILTERS: Array<LifecycleModule | "all"> = [
  "all",
  "orders",
  "bookings",
  "dresses",
  "veils",
  "bridal_robes",
  "categories",
  "messages",
  "shipping_regions",
  "gallery",
  "customers",
  "notification_logs",
  "customer_notifications",
];

export function TrashManager() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moduleFilter, setModuleFilter] = useState<LifecycleModule | "all">(
    "all"
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<null | {
    kind: "permanent" | "empty" | "bulk_permanent";
    item?: TrashItem;
  }>(null);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);
  const [lastRestored, setLastRestored] = useState<TrashItem | null>(null);

  const keyOf = (item: TrashItem) => `${item.module}:${item.id}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs =
        moduleFilter === "all" ? "" : `?module=${encodeURIComponent(moduleFilter)}`;
      const res = await fetch(`/api/admin/trash${qs}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل جلب سلة المحذوفات");
      setItems((data.items ?? []) as TrashItem[]);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل جلب سلة المحذوفات");
    } finally {
      setLoading(false);
    }
  }, [moduleFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const selectedItems = useMemo(
    () => items.filter((i) => selected.has(keyOf(i))),
    [items, selected]
  );

  const toggle = (item: TrashItem) => {
    const k = keyOf(item);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const restoreOne = async (item: TrashItem) => {
    setBusy(true);
    const result = await postTrash({
      action: "restore",
      module: item.module,
      id: item.id,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setLastRestored(item);
    setItems((prev) => prev.filter((x) => keyOf(x) !== keyOf(item)));
    setSnack(`تمت استعادة: ${item.title}`);
  };

  const permanentOne = async (item: TrashItem) => {
    setBusy(true);
    const result = await postTrash({
      action: "permanent_delete",
      module: item.module,
      id: item.id,
    });
    setBusy(false);
    setConfirm(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setItems((prev) => prev.filter((x) => keyOf(x) !== keyOf(item)));
    setSnack("تم الحذف النهائي");
  };

  const bulkRestore = async () => {
    setBusy(true);
    for (const item of selectedItems) {
      await postTrash({
        action: "restore",
        module: item.module,
        id: item.id,
      });
    }
    setBusy(false);
    setSnack(`تمت استعادة ${selectedItems.length} عنصر`);
    await load();
  };

  const bulkPermanent = async () => {
    setBusy(true);
    for (const item of selectedItems) {
      const result = await postTrash({
        action: "permanent_delete",
        module: item.module,
        id: item.id,
      });
      if (!result.ok) {
        setError(result.error);
        break;
      }
    }
    setBusy(false);
    setConfirm(null);
    await load();
  };

  const emptyAll = async () => {
    setBusy(true);
    const result = await postTrash({
      action: "empty",
      module: moduleFilter === "all" ? undefined : moduleFilter,
    });
    setBusy(false);
    setConfirm(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSnack(`تم تفريغ السلة (${result.deleted ?? 0})`);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">🗑️ سلة المحذوفات</h1>
          <p className="mt-1 text-sm text-muted">
            استعادة العناصر أو حذفها نهائياً. الطلبات والحجوزات لا تُحذف تلقائياً أبداً.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" loading={loading} onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            تحديث
          </Button>
          <Button
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50"
            onClick={() => setConfirm({ kind: "empty" })}
            disabled={items.length === 0}
          >
            <Trash2 className="h-4 w-4" />
            تفريغ السلة
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {MODULE_FILTERS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setModuleFilter(m)}
            className={
              moduleFilter === m
                ? "rounded-full bg-gold px-3 py-1.5 text-sm text-white"
                : "rounded-full bg-beige px-3 py-1.5 text-sm text-charcoal hover:bg-beige-dark/40"
            }
          >
            {m === "all" ? "الكل" : MODULE_LABEL_AR[m]}
          </button>
        ))}
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
                <th className="px-4 py-3 text-right font-medium">تحديد</th>
                <th className="px-4 py-3 text-right font-medium">العنصر</th>
                <th className="px-4 py-3 text-right font-medium">الوحدة</th>
                <th className="px-4 py-3 text-right font-medium">تاريخ الحذف</th>
                <th className="px-4 py-3 text-right font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">
                    جاري التحميل...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">
                    سلة المحذوفات فارغة
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={keyOf(item)} className="border-t border-beige-dark/60">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(keyOf(item))}
                        onChange={() => toggle(item)}
                        aria-label="تحديد"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-charcoal">
                      {item.title}
                      <p className="mt-0.5 text-xs text-muted" dir="ltr">
                        {item.id}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {MODULE_LABEL_AR[item.module] ?? item.module}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {item.deleted_at ? formatDate(item.deleted_at) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() => void restoreOne(item)}
                          disabled={busy}
                        >
                          استعادة
                        </Button>
                        <Button
                          variant="outline"
                          className="border-red-200 text-red-700 hover:bg-red-50"
                          onClick={() =>
                            setConfirm({ kind: "permanent", item })
                          }
                          disabled={busy}
                        >
                          حذف نهائي
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

      <BulkActionBar
        selectedCount={selected.size}
        mode="trash"
        onClear={() => setSelected(new Set())}
        onRestore={() => void bulkRestore()}
        onDelete={() => setConfirm({ kind: "bulk_permanent" })}
      />

      <ConfirmDialog
        open={confirm?.kind === "permanent"}
        title="حذف نهائي؟"
        description="لا يمكن التراجع عن هذا الإجراء. سيتم حذف العنصر من قاعدة البيانات نهائياً."
        confirmLabel="حذف نهائي"
        danger
        loading={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.item) void permanentOne(confirm.item);
        }}
      />
      <ConfirmDialog
        open={confirm?.kind === "bulk_permanent"}
        title="حذف نهائي للعناصر المحددة؟"
        description={`سيتم حذف ${selected.size} عنصر نهائياً.`}
        confirmLabel="حذف نهائي"
        danger
        loading={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void bulkPermanent()}
      />
      <ConfirmDialog
        open={confirm?.kind === "empty"}
        title="تفريغ سلة المحذوفات؟"
        description="حذف نهائي لكل العناصر الظاهرة في التصفية الحالية. الطلبات/الحجوزات المحذوفة تبقى قابلة للحذف اليدوي فقط عند التأكيد."
        confirmLabel="تفريغ السلة"
        danger
        loading={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void emptyAll()}
      />

      <UndoSnackbar
        message={snack}
        onDismiss={() => {
          setSnack(null);
          setLastRestored(null);
        }}
        onUndo={
          lastRestored
            ? async () => {
                const item = lastRestored;
                setLastRestored(null);
                await fetch("/api/admin/lifecycle", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "soft_delete",
                    module: item.module,
                    id: item.id,
                  }),
                });
                setSnack(null);
                await load();
              }
            : undefined
        }
      />
    </div>
  );
}
