"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import {
  FEATURE_GROUP_KEYS,
  FEATURE_GROUP_LABELS,
  type ExperienceFeature,
  type FeatureGroupKey,
} from "@/lib/products/experience-features";

export function FeaturesLibraryManager() {
  const [features, setFeatures] = useState<ExperienceFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/experience-features", {
        cache: "no-store",
      });
      const data = (await res.json()) as { features?: ExperienceFeature[] };
      if (!res.ok) throw new Error("تعذّر التحميل");
      setFeatures(data.features ?? []);
    } catch {
      setError("تعذّر تحميل الميزات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const update = (idx: number, patch: Partial<ExperienceFeature>) => {
    setFeatures((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const saveOne = async (feature: ExperienceFeature) => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/experience-features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feature),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "فشل الحفظ");
      }
      setMessage("تم الحفظ");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const addNew = () => {
    const id = `feature_${Date.now().toString(36)}`;
    setFeatures((prev) => [
      ...prev,
      {
        id,
        name: "New Feature",
        name_ar: "ميزة جديدة",
        description: "",
        description_ar: "",
        group_key: "general",
        maps_to: null,
        is_system: false,
        enabled: true,
        sort_order: prev.length * 10 + 10,
      },
    ]);
  };

  const remove = async (feature: ExperienceFeature) => {
    if (feature.is_system) return;
    if (!confirm("حذف هذه الميزة؟")) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/experience-features?id=${encodeURIComponent(feature.id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "فشل الحذف");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل الحذف");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted">جاري التحميل…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          الميزات تُعرَّف مرة واحدة وتُفعَّل لكل منتج من تبويب «الميزات» في محرر
          المنتج. بدون مصطلحات تقنية.
        </p>
        <Button type="button" size="sm" onClick={addNew} disabled={saving}>
          إضافة ميزة
        </Button>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      <div className="space-y-4">
        {features.map((f, idx) => (
          <div
            key={f.id}
            className="rounded-2xl border border-beige-dark bg-white p-5"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="accent-gold"
                    checked={f.enabled}
                    onChange={(e) => update(idx, { enabled: e.target.checked })}
                  />
                  مفعّلة في المكتبة
                </label>
                {f.is_system ? (
                  <span className="rounded-full bg-beige px-2 py-0.5 text-[10px] text-muted">
                    نظام
                  </span>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void saveOne(f)}
                  disabled={saving}
                >
                  حفظ
                </Button>
                {!f.is_system ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void remove(f)}
                    disabled={saving}
                  >
                    حذف
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="المعرّف"
                value={f.id}
                disabled={f.is_system}
                onChange={(e) => update(idx, { id: e.target.value })}
                dir="ltr"
              />
              <Select
                label="المجموعة"
                value={f.group_key}
                onChange={(e) =>
                  update(idx, {
                    group_key: e.target.value as FeatureGroupKey,
                  })
                }
                options={FEATURE_GROUP_KEYS.map((k) => ({
                  value: k,
                  label: FEATURE_GROUP_LABELS[k],
                }))}
              />
              <Input
                label="الاسم (عربي)"
                value={f.name_ar}
                onChange={(e) => update(idx, { name_ar: e.target.value })}
              />
              <Input
                label="Name (EN)"
                value={f.name}
                onChange={(e) => update(idx, { name: e.target.value })}
                dir="ltr"
              />
              <div className="sm:col-span-2">
                <Textarea
                  label="الوصف"
                  value={f.description_ar}
                  onChange={(e) =>
                    update(idx, { description_ar: e.target.value })
                  }
                  rows={2}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
