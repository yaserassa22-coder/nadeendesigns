"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import type { LifecycleModule } from "@/lib/admin/lifecycle-types";
import { postTrash } from "@/lib/admin/lifecycle-client";
import { formatDate } from "@/lib/utils";
import { formatMessage } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { BulkActionBar } from "@/components/admin/lifecycle/BulkActionBar";
import { ConfirmDialog } from "@/components/admin/lifecycle/ConfirmDialog";
import { UndoSnackbar } from "@/components/admin/lifecycle/UndoSnackbar";
import { useLocale } from "@/components/i18n/LocaleProvider";

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
  const { t, dir } = useLocale();
  const tu = t.admin.trashUi;
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
  const [canRestore, setCanRestore] = useState(true);
  const [canPermanent, setCanPermanent] = useState(true);

  const moduleLabel = useCallback(
    (m: LifecycleModule) => tu.modules[m] ?? m,
    [tu.modules]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetch("/api/admin/me", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (d?.capabilities) {
            setCanRestore(Boolean(d.capabilities.canRestore));
            setCanPermanent(Boolean(d.capabilities.canPermanentDelete));
          }
        })
        .catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const keyOf = (item: TrashItem) => `${item.module}:${item.id}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs =
        moduleFilter === "all" ? "" : `?module=${encodeURIComponent(moduleFilter)}`;
      const res = await fetch(`/api/admin/trash${qs}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || tu.loadFailed);
      setItems((data.items ?? []) as TrashItem[]);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : tu.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [moduleFilter, tu.loadFailed]);

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
    setSnack(formatMessage(tu.restored, { title: item.title }));
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
    setSnack(tu.permanentDeleted);
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
    setSnack(formatMessage(tu.bulkRestored, { count: selectedItems.length }));
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
    setSnack(formatMessage(tu.emptied, { count: result.deleted ?? 0 }));
    await load();
  };

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">{tu.title}</h1>
          <p className="mt-1 text-sm text-muted">{tu.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              window.location.assign("/api/admin/export?module=notifications");
            }}
          >
            {(tu as { exportNotifications?: string }).exportNotifications ??
              "تصدير الإشعارات CSV"}
          </Button>
          <Button variant="outline" loading={loading} onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            {tu.refresh}
          </Button>
          {canPermanent ? (
            <Button
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => setConfirm({ kind: "empty" })}
              disabled={items.length === 0}
            >
              <Trash2 className="h-4 w-4" />
              {tu.emptyTrash}
            </Button>
          ) : null}
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
            {m === "all" ? tu.all : moduleLabel(m)}
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
                <th className="px-4 py-3 text-start font-medium">{tu.select}</th>
                <th className="px-4 py-3 text-start font-medium">{tu.colItem}</th>
                <th className="px-4 py-3 text-start font-medium">{tu.colModule}</th>
                <th className="px-4 py-3 text-start font-medium">{tu.colDeletedAt}</th>
                <th className="px-4 py-3 text-start font-medium">{tu.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">
                    {tu.loading}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">
                    {tu.empty}
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
                        aria-label={tu.select}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-charcoal">
                      {item.title}
                      <p className="mt-0.5 text-xs text-muted" dir="ltr">
                        {item.id}
                      </p>
                    </td>
                    <td className="px-4 py-3">{moduleLabel(item.module)}</td>
                    <td className="px-4 py-3 text-muted">
                      {item.deleted_at ? formatDate(item.deleted_at) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {canRestore ? (
                          <Button
                            variant="outline"
                            onClick={() => void restoreOne(item)}
                            disabled={busy}
                          >
                            {tu.restore}
                          </Button>
                        ) : null}
                        {canPermanent ? (
                          <Button
                            variant="outline"
                            className="border-red-200 text-red-700 hover:bg-red-50"
                            onClick={() =>
                              setConfirm({ kind: "permanent", item })
                            }
                            disabled={busy}
                          >
                            {tu.permanentDelete}
                          </Button>
                        ) : null}
                        {!canRestore && !canPermanent ? (
                          <span className="text-xs text-muted">{tu.viewOnly}</span>
                        ) : null}
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
        title={tu.permanentConfirmTitle}
        description={tu.permanentConfirmDesc}
        confirmLabel={tu.permanentConfirmLabel}
        danger
        loading={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.item) void permanentOne(confirm.item);
        }}
      />
      <ConfirmDialog
        open={confirm?.kind === "bulk_permanent"}
        title={tu.bulkPermanentTitle}
        description={formatMessage(tu.bulkPermanentDesc, {
          count: selected.size,
        })}
        confirmLabel={tu.permanentConfirmLabel}
        danger
        loading={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void bulkPermanent()}
      />
      <ConfirmDialog
        open={confirm?.kind === "empty"}
        title={tu.emptyConfirmTitle}
        description={tu.emptyConfirmDesc}
        confirmLabel={tu.emptyConfirmLabel}
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
