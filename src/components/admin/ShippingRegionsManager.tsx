"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash2, X } from "lucide-react";
import type { ShippingRegion } from "@/types/shop";
import type { SiteSettings } from "@/types";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface ShippingRegionsManagerProps {
  initialRegions: ShippingRegion[];
  initialSettings: SiteSettings;
}

const emptyForm = {
  name_ar: "",
  name_en: "",
  shipping_fee: "0",
  sort_order: "0",
  is_active: true,
};

export function ShippingRegionsManager({
  initialRegions,
  initialSettings,
}: ShippingRegionsManagerProps) {
  const [regions, setRegions] = useState(initialRegions);
  const [settings, setSettings] = useState(initialSettings);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ShippingRegion | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState("");
  const [settingsMsg, setSettingsMsg] = useState("");

  const reset = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
  };

  const openCreate = () => {
    reset();
    setOpen(true);
  };

  const openEdit = (item: ShippingRegion) => {
    setEditing(item);
    setForm({
      name_ar: item.name_ar,
      name_en: item.name_en ?? "",
      shipping_fee: String(item.shipping_fee ?? 0),
      sort_order: String(item.sort_order ?? 0),
      is_active: item.is_active,
    });
    setError("");
    setOpen(true);
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    setSettingsMsg("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "فشل حفظ الإعدادات");
      setSettingsMsg("تم حفظ إعدادات الاستلام والتوصيل");
    } catch (e) {
      setSettingsMsg(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setSavingSettings(false);
    }
  };

  const save = async () => {
    if (!form.name_ar.trim()) {
      setError("اسم المنطقة مطلوب");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = {
        name_ar: form.name_ar.trim(),
        name_en: form.name_en.trim(),
        shipping_fee: Math.max(0, Number(form.shipping_fee) || 0),
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      };
      const res = await fetch("/api/shipping-regions", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, ...body } : body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "فشل الحفظ");

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
      }
      setOpen(false);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
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
      alert(data.error ?? "فشل التحديث");
      return;
    }
    setRegions((prev) => prev.map((r) => (r.id === item.id ? data : r)));
  };

  const move = async (item: ShippingRegion, dir: -1 | 1) => {
    const sorted = [...regions].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((r) => r.id === item.id);
    const swap = sorted[idx + dir];
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
      alert(r1.error || r2.error || "فشل إعادة الترتيب");
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

  const remove = async (item: ShippingRegion) => {
    if (!confirm(`حذف المنطقة «${item.name_ar}»؟`)) return;
    const res = await fetch(`/api/shipping-regions?id=${item.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "فشل الحذف");
      return;
    }
    setRegions((prev) => prev.filter((r) => r.id !== item.id));
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-beige-dark bg-white p-6">
        <h2 className="text-lg font-semibold text-charcoal">
          طرق استلام الطلب
        </h2>
        <p className="mt-1 text-sm text-muted">
          تفعيل أو تعطيل الاستلام من البوتيك والتوصيل في صفحة إتمام الطلب.
        </p>
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-3 rounded-xl border border-beige-dark px-4 py-3 text-sm">
            <input
              type="checkbox"
              checked={settings.boutique_pickup_enabled}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  boutique_pickup_enabled: e.target.checked,
                }))
              }
              className="h-4 w-4 accent-gold"
            />
            تفعيل الاستلام من البوتيك (مجاناً)
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-beige-dark px-4 py-3 text-sm">
            <input
              type="checkbox"
              checked={settings.delivery_enabled}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  delivery_enabled: e.target.checked,
                }))
              }
              className="h-4 w-4 accent-gold"
            />
            تفعيل التوصيل حسب المناطق
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
          حفظ طرق الاستلام
        </Button>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">مناطق الشحن</h2>
          <p className="mt-1 text-sm text-muted">
            أضيفي وعدّلي المناطق ورسوم الشحن وترتيبها.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="ml-1 h-4 w-4" />
          إضافة منطقة
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-beige-dark bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-beige/60 text-muted">
              <tr>
                <th className="px-4 py-3 text-right font-medium">المنطقة</th>
                <th className="px-4 py-3 text-right font-medium">الرسوم</th>
                <th className="px-4 py-3 text-right font-medium">الترتيب</th>
                <th className="px-4 py-3 text-right font-medium">الحالة</th>
                <th className="px-4 py-3 text-right font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {regions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">
                    لا توجد مناطق بعد
                  </td>
                </tr>
              ) : (
                regions.map((item) => (
                  <tr key={item.id} className="border-t border-beige-dark/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-charcoal">{item.name_ar}</p>
                      {item.name_en && (
                        <p className="text-xs text-muted" dir="ltr">
                          {item.name_en}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3" dir="ltr">
                      {formatPrice(Number(item.shipping_fee))}
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
                        {item.is_active ? "نشطة" : "معطّلة"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => move(item, -1)}
                          className="rounded-lg p-2 text-muted hover:bg-beige"
                          aria-label="تحريك لأعلى"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(item, 1)}
                          className="rounded-lg p-2 text-muted hover:bg-beige"
                          aria-label="تحريك لأسفل"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="rounded-lg p-2 text-gold hover:bg-gold/10"
                          aria-label="تعديل"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(item)}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                          aria-label="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
            aria-label="إغلاق"
            onClick={() => {
              setOpen(false);
              reset();
            }}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-beige-dark bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                reset();
              }}
              className="absolute left-4 top-4 rounded-lg p-1 hover:bg-beige"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-semibold text-charcoal">
              {editing ? "تعديل المنطقة" : "إضافة منطقة"}
            </h3>
            <div className="mt-4 space-y-3">
              <Input
                label="الاسم بالعربية *"
                value={form.name_ar}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name_ar: e.target.value }))
                }
              />
              <Input
                label="الاسم بالإنجليزية"
                value={form.name_en}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name_en: e.target.value }))
                }
                dir="ltr"
              />
              <Input
                label="رسوم الشحن"
                type="number"
                min={0}
                step="1"
                value={form.shipping_fee}
                onChange={(e) =>
                  setForm((f) => ({ ...f, shipping_fee: e.target.value }))
                }
                dir="ltr"
              />
              <Input
                label="الترتيب"
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
                منطقة نشطة
              </label>
              {error && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}
              <Button loading={saving} onClick={save} className="w-full">
                حفظ
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
