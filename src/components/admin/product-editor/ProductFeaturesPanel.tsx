"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FEATURE_GROUP_KEYS,
  FEATURE_GROUP_LABELS,
  defaultFeatureIdsForProduct,
  type ExperienceFeature,
  type FeatureGroupKey,
  type ProductFeaturesConfig,
} from "@/lib/products/experience-features";
import type { ProductCommerceType } from "@/lib/products/primary-action";

type Props = {
  value: ProductFeaturesConfig | null;
  onChange: (next: ProductFeaturesConfig) => void;
  productType: ProductCommerceType;
};

/**
 * Product Editor — Features tab.
 * Simple enable/disable switches; no technical jargon.
 */
export function ProductFeaturesPanel({
  value,
  onChange,
  productType,
}: Props) {
  const [library, setLibrary] = useState<ExperienceFeature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/admin/experience-features", {
            cache: "no-store",
          });
          const data = (await res.json()) as { features?: ExperienceFeature[] };
          if (!cancelled && res.ok) {
            setLibrary((data.features ?? []).filter((f) => f.enabled));
          }
        } catch {
          /* keep empty — defaults still work */
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  const defaults = useMemo(
    () => defaultFeatureIdsForProduct({ productType }),
    [productType]
  );

  const useCustom = Boolean(value?.use_custom);
  const enabledSet = useMemo(() => {
    const ids = useCustom ? (value?.enabled_ids ?? []) : defaults;
    return new Set(ids);
  }, [useCustom, value?.enabled_ids, defaults]);

  const toggle = (id: string, on: boolean) => {
    const base = useCustom
      ? [...(value?.enabled_ids ?? [])]
      : [...defaults];
    const next = new Set(base);
    if (on) next.add(id);
    else next.delete(id);
    onChange({ use_custom: true, enabled_ids: [...next] });
  };

  const grouped = useMemo(() => {
    const map = new Map<FeatureGroupKey, ExperienceFeature[]>();
    for (const key of FEATURE_GROUP_KEYS) map.set(key, []);
    for (const f of library) {
      const list = map.get(f.group_key) ?? map.get("general")!;
      list.push(f);
    }
    return FEATURE_GROUP_KEYS.map((key) => ({
      key,
      label: FEATURE_GROUP_LABELS[key],
      items: map.get(key) ?? [],
    })).filter((g) => g.items.length > 0);
  }, [library]);

  if (loading) {
    return <p className="text-sm text-muted">جاري تحميل الميزات…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-beige-dark bg-beige/20 px-5 py-4">
        <p className="text-sm text-muted">
          فعّلي الميزات المناسبة لهذا المنتج فقط. ما يُعطَّل لن يظهر للعميلة في
          صفحة المنتج أو نافذة التجربة.
        </p>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-gold"
            checked={!useCustom}
            onChange={(e) => {
              if (e.target.checked) {
                onChange({ use_custom: false, enabled_ids: [] });
              } else {
                onChange({ use_custom: true, enabled_ids: [...defaults] });
              }
            }}
          />
          استخدام الإعدادات الافتراضية حسب نوع المنتج
        </label>
      </div>

      {grouped.map((group) => (
        <div key={group.key} className="space-y-3">
          <h3 className="text-sm font-semibold text-charcoal">{group.label}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.items.map((f) => {
              const on = enabledSet.has(f.id);
              return (
                <label
                  key={f.id}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-beige-dark bg-white px-4 py-3 transition-colors hover:border-gold/30"
                >
                  <input
                    type="checkbox"
                    className="mt-1 accent-gold"
                    checked={on}
                    onChange={(e) => toggle(f.id, e.target.checked)}
                  />
                  <span>
                    <span className="block text-sm font-medium text-charcoal">
                      {f.name_ar || f.name}
                    </span>
                    {f.description_ar ? (
                      <span className="mt-0.5 block text-xs text-muted">
                        {f.description_ar}
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {library.length === 0 ? (
        <p className="text-sm text-muted">
          مكتبة الميزات فارغة. أضيفي ميزات من محرك التجربة ← الميزات، أو طبّقي
          ترحيل 040.
        </p>
      ) : null}
    </div>
  );
}
