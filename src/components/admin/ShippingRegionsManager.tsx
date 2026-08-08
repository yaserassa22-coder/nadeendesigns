"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import type { ShippingRegion } from "@/types/shop";
import type { SiteSettings } from "@/types";
import type { UnknownShippingRegionHint } from "@/lib/admin/shipping-regions-data";
import type { ListVisibility } from "@/lib/admin/lifecycle-types";
import { filterLifecycleRows } from "@/lib/admin/query-lifecycle";
import type { LifecycleCapabilities } from "@/lib/admin/permissions";
import { formatEstimatedDelivery } from "@/lib/shop/shipping";
import { formatPrice } from "@/lib/utils";
import { formatMessage } from "@/lib/i18n";
import { localizedName } from "@/lib/i18n/localize";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { RowLifecycleActions } from "@/components/admin/lifecycle/RowLifecycleActions";
import { VisibilityFilter } from "@/components/admin/lifecycle/VisibilityFilter";

type ShippingRegionRow = ShippingRegion & {
  is_deleted?: boolean | null;
  archived_at?: string | null;
};

interface ShippingRegionsManagerProps {
  initialRegions: ShippingRegion[];
  initialSettings: SiteSettings;
  initialUnknownRegions?: UnknownShippingRegionHint[];
}

const emptyForm = {
  name_ar: "",
  name_en: "",
  name_he: "",
  carrier_code: "",
  shipping_fee: "0",
  sort_order: "0",
  is_active: true,
  estimated_days_min: "",
  estimated_days_max: "",
  estimated_delivery_ar: "",
  estimated_delivery_he: "",
  estimated_delivery_en: "",
};

export function ShippingRegionsManager({
  initialRegions,
  initialSettings,
  initialUnknownRegions = [],
}: ShippingRegionsManagerProps) {
  const { t, locale, dir } = useLocale();
  const s = t.admin.shippingRegionsUi;
  const [regions, setRegions] = useState<ShippingRegionRow[]>(initialRegions);
  const [unknownRegions, setUnknownRegions] = useState(initialUnknownRegions);
  const [settings, setSettings] = useState(initialSettings);
  const [visibility, setVisibility] = useState<ListVisibility>("active");
  const [caps, setCaps] = useState<LifecycleCapabilities | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ShippingRegion | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState("");
  const [settingsMsg, setSettingsMsg] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetch("/api/admin/me", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (d?.capabilities) setCaps(d.capabilities);
        })
        .catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const visibleRegions = useMemo(
    () => filterLifecycleRows(regions, visibility),
    [regions, visibility]
  );

  const reset = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
  };

  const openCreate = (prefillName?: string) => {
    reset();
    if (prefillName) {
      setForm((f) => ({ ...f, name_ar: prefillName }));
    }
    setOpen(true);
  };

  const openEdit = (item: ShippingRegion) => {
    setEditing(item);
    setForm({
      name_ar: item.name_ar,
      name_en: item.name_en ?? "",
      name_he: item.name_he ?? "",
      carrier_code: item.carrier_code ?? "",
      shipping_fee: String(item.shipping_fee ?? 0),
      sort_order: String(item.sort_order ?? 0),
      is_active: item.is_active,
      estimated_days_min:
        item.estimated_days_min != null
          ? String(item.estimated_days_min)
          : item.estimated_days != null
            ? String(item.estimated_days)
            : "",
      estimated_days_max:
        item.estimated_days_max != null
          ? String(item.estimated_days_max)
          : item.estimated_days != null
            ? String(item.estimated_days)
            : "",
      estimated_delivery_ar: item.estimated_delivery_ar ?? "",
      estimated_delivery_he: item.estimated_delivery_he ?? "",
      estimated_delivery_en: item.estimated_delivery_en ?? "",
    });
    setError("");
    setOpen(true);
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    setSettingsMsg("");
    try {
      // Partial patch — server merges so CMS / contact keys are never wiped
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boutique_pickup_enabled: settings.boutique_pickup_enabled,
          delivery_enabled: settings.delivery_enabled,
          shipping_enabled: settings.shipping_enabled,
          shipping_flat_fee: settings.shipping_flat_fee,
          shipping_free_threshold: settings.shipping_free_threshold,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? s.settingsSaveFailed);
      if (data.settings) setSettings(data.settings as SiteSettings);
      setSettingsMsg(s.settingsSaved);
    } catch (e) {
      setSettingsMsg(e instanceof Error ? e.message : s.genericError);
    } finally {
      setSavingSettings(false);
    }
  };

  const parseOptionalInt = (v: string) => {
    if (!v.trim()) return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
  };

  const save = async () => {
    if (!form.name_ar.trim()) {
      setError(s.nameRequired);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const minDays = parseOptionalInt(form.estimated_days_min);
      const maxDays = parseOptionalInt(form.estimated_days_max);
      const body = {
        name_ar: form.name_ar.trim(),
        name_en: form.name_en.trim(),
        name_he: form.name_he.trim(),
        carrier_code: form.carrier_code.trim() || null,
        shipping_fee: Math.max(0, Number(form.shipping_fee) || 0),
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
        estimated_days_min: minDays,
        estimated_days_max: maxDays ?? minDays,
        estimated_days: minDays,
        estimated_delivery_ar: form.estimated_delivery_ar.trim() || null,
        estimated_delivery_he: form.estimated_delivery_he.trim() || null,
        estimated_delivery_en: form.estimated_delivery_en.trim() || null,
      };
      const res = await fetch("/api/shipping-regions", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, ...body } : body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? s.saveFailed);

      if (editing) {
        setRegions((prev) =>
          prev
            .map((r) => (r.id === editing.id ? data : r))
            .sort((a, b) => a.sort_order - b.sort_order)
        );
      } else {
        setRegions((prev) =>
          [...prev, data].sort((a, b) => a.sort_order - b.sort_order)
        );
        setUnknownRegions((prev) =>
          prev.filter(
            (u) =>
              u.text.trim().toLowerCase() !== form.name_ar.trim().toLowerCase()
          )
        );
      }
      setOpen(false);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : s.genericError);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: ShippingRegion) => {
    const res = await fetch("/api/shipping-regions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, is_active: !item.is_active }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? s.updateFailed);
      return;
    }
    setRegions((prev) => prev.map((r) => (r.id === item.id ? data : r)));
  };

  const move = async (item: ShippingRegion, delta: -1 | 1) => {
    const sorted = [...visibleRegions].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((r) => r.id === item.id);
    const swap = sorted[idx + delta];
    if (!swap) return;
    const aOrder = item.sort_order;
    const bOrder = swap.sort_order;
    const [r1, r2] = await Promise.all([
      fetch("/api/shipping-regions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, sort_order: bOrder }),
      }).then((r) => r.json()),
      fetch("/api/shipping-regions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: swap.id, sort_order: aOrder }),
      }).then((r) => r.json()),
    ]);
    if (r1.error || r2.error) {
      alert(r1.error || r2.error || s.reorderFailed);
      return;
    }
    setRegions((prev) =>
      prev
        .map((r) => {
          if (r.id === item.id) return { ...r, sort_order: bOrder };
          if (r.id === swap.id) return { ...r, sort_order: aOrder };
          return r;
        })
        .sort((a, b) => a.sort_order - b.sort_order)
    );
  };

  const knownNames = new Set(
    regions.map((r) => r.name_ar.trim().toLowerCase())
  );
  const pendingUnknown = unknownRegions.filter(
    (u) => !knownNames.has(u.text.trim().toLowerCase())
  );

  return (
    <div className="space-y-8" dir={dir}>
      <div className="rounded-2xl border border-beige-dark bg-white p-6">
        <h2 className="text-lg font-semibold text-charcoal">
          {s.pickupMethodsTitle}
        </h2>
        <p className="mt-1 text-sm text-muted">{s.pickupMethodsSubtitle}</p>
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-3 rounded-xl border border-beige-dark px-4 py-3 text-sm">
            <input
              type="checkbox"
              checked={settings.boutique_pickup_enabled}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  boutique_pickup_enabled: e.target.checked,
                }))
              }
              className="h-4 w-4 accent-gold"
            />
            {s.boutiquePickup}
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-beige-dark px-4 py-3 text-sm">
            <input
              type="checkbox"
              checked={settings.delivery_enabled}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  delivery_enabled: e.target.checked,
                }))
              }
              className="h-4 w-4 accent-gold"
            />
            {s.deliveryByRegion}
          </label>
        </div>
        {settingsMsg && (
          <p className="mt-3 text-sm text-muted">{settingsMsg}</p>
        )}
        <Button
          className="mt-4"
          loading={savingSettings}
          onClick={saveSettings}
        >
          {s.savePickupMethods}
        </Button>
      </div>

      {pendingUnknown.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-6">
          <h2 className="text-lg font-semibold text-amber-950">
            {s.unknownTitle}
          </h2>
          <p className="mt-1 text-sm text-amber-900/80">{s.unknownSubtitle}</p>
          <ul className="mt-4 space-y-3">
            {pendingUnknown.map((u) => (
              <li
                key={u.text}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white px-4 py-3"
              >
                <div>
                  <p className="font-medium text-charcoal">{u.text}</p>
                  <p className="text-xs text-muted">
                    {formatMessage(s.appearedInOrders, { count: u.orderCount })}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => openCreate(u.text)}
                >
                  {s.addAsRegion}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">{s.regionsTitle}</h2>
          <p className="mt-1 text-sm text-muted">{s.regionsSubtitle}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="mb-1.5 text-sm text-muted">
              {t.admin.productsUi.visibility}
            </p>
            <VisibilityFilter value={visibility} onChange={setVisibility} />
          </div>
          <Button onClick={() => openCreate()}>
            <Plus className="ms-1 h-4 w-4" />
            {s.addRegion}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-beige-dark bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-beige/60 text-muted">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{s.colRegion}</th>
                <th className="px-4 py-3 text-start font-medium">{s.colFee}</th>
                <th className="px-4 py-3 text-start font-medium">{s.colDelivery}</th>
                <th className="px-4 py-3 text-start font-medium">{s.colOrder}</th>
                <th className="px-4 py-3 text-start font-medium">{s.colStatus}</th>
                <th className="px-4 py-3 text-start font-medium">{s.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {visibleRegions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    {s.empty}
                  </td>
                </tr>
              ) : (
                visibleRegions.map((item) => (
                  <tr key={item.id} className="border-t border-beige-dark/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-charcoal">
                        {localizedName(item, locale, item.name_ar)}
                      </p>
                      {item.name_en && locale !== "en" ? (
                        <p className="text-xs text-muted" dir="ltr">
                          {item.name_en}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3" dir="ltr">
                      {formatPrice(Number(item.shipping_fee))}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatEstimatedDelivery(item) || "—"}
                    </td>
                    <td className="px-4 py-3">{item.sort_order}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleActive(item)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                          item.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-stone-100 text-stone-500"
                        }`}
                      >
                        {item.is_active ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                        {item.is_active ? s.active : s.inactive}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => move(item, -1)}
                          className="rounded-lg p-2 text-muted hover:bg-beige"
                          aria-label={s.moveUp}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(item, 1)}
                          className="rounded-lg p-2 text-muted hover:bg-beige"
                          aria-label={s.moveDown}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="rounded-lg p-2 text-gold hover:bg-gold/10"
                          aria-label={s.edit}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <RowLifecycleActions
                          module="shipping_regions"
                          id={item.id}
                          archived={Boolean(item.archived_at)}
                          allowArchive={caps?.canArchive ?? false}
                          allowRestore={caps?.canRestore ?? false}
                          allowSoftDelete={caps?.canSoftDelete ?? false}
                          onChanged={(kind) => {
                            if (kind === "soft_delete") {
                              setRegions((prev) =>
                                prev.filter((r) => r.id !== item.id)
                              );
                              return;
                            }
                            setRegions((prev) =>
                              prev.map((r) =>
                                r.id === item.id
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
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-charcoal/40"
            aria-label={s.close}
            onClick={() => {
              setOpen(false);
              reset();
            }}
          />
          <div
            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-beige-dark bg-white p-6 shadow-xl"
            dir={dir}
          >
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                reset();
              }}
              className="absolute start-4 top-4 rounded-lg p-1 hover:bg-beige"
              aria-label={s.close}
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-semibold text-charcoal">
              {editing ? s.editRegion : s.newRegion}
            </h3>
            <div className="mt-4 space-y-3">
              <Input
                label={s.nameAr}
                value={form.name_ar}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name_ar: e.target.value }))
                }
              />
              <Input
                label={s.nameHe}
                value={form.name_he}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name_he: e.target.value }))
                }
              />
              <Input
                label={s.nameEn}
                value={form.name_en}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name_en: e.target.value }))
                }
                dir="ltr"
              />
              <Input
                label={s.carrierCode}
                value={form.carrier_code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, carrier_code: e.target.value }))
                }
                dir="ltr"
                placeholder="hfd · israel_post · cheetah · self"
              />
              <Input
                label={s.shippingFee}
                type="number"
                min={0}
                step="1"
                value={form.shipping_fee}
                onChange={(e) =>
                  setForm((f) => ({ ...f, shipping_fee: e.target.value }))
                }
                dir="ltr"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={s.daysMin}
                  type="number"
                  min={0}
                  value={form.estimated_days_min}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      estimated_days_min: e.target.value,
                    }))
                  }
                  dir="ltr"
                />
                <Input
                  label={s.daysMax}
                  type="number"
                  min={0}
                  value={form.estimated_days_max}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      estimated_days_max: e.target.value,
                    }))
                  }
                  dir="ltr"
                />
              </div>
              <Input
                label={s.deliveryText}
                placeholder={s.deliveryTextPlaceholder}
                value={form.estimated_delivery_ar}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    estimated_delivery_ar: e.target.value,
                  }))
                }
              />
              <Input
                label={s.deliveryTextHe}
                value={form.estimated_delivery_he}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    estimated_delivery_he: e.target.value,
                  }))
                }
              />
              <Input
                label={s.deliveryTextEn}
                value={form.estimated_delivery_en}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    estimated_delivery_en: e.target.value,
                  }))
                }
                dir="ltr"
              />
              <Input
                label={s.sortOrder}
                type="number"
                value={form.sort_order}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sort_order: e.target.value }))
                }
                dir="ltr"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, is_active: e.target.checked }))
                  }
                  className="h-4 w-4 accent-gold"
                />
                {s.regionActive}
              </label>
              {error && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}
              <Button loading={saving} onClick={save} className="w-full">
                {s.save}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
