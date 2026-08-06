"use client";

import { useEffect, useMemo, useState } from "react";
import {
  allowedFeatureIdsForProduct,
  defaultFeatureIdsForProduct,
  sanitizeProductFeaturesConfig,
  type ExperienceFeature,
  type ProductFeaturesConfig,
} from "@/lib/products/experience-features";
import type { ProductCommerceType } from "@/lib/products/primary-action";
import { defaultProductExperienceConfig } from "@/lib/products/experience-designer";
import { ProductExperienceLivePreview } from "@/components/admin/product-editor/ProductExperienceLivePreview";

type Props = {
  value: ProductFeaturesConfig | null;
  onChange: (next: ProductFeaturesConfig) => void;
  productType: ProductCommerceType;
};

/** Admin-facing Purchase Experience groups — no raw JSON / technical ids. */
const PURCHASE_EXPERIENCE_GROUPS: {
  label: string;
  featureIds: readonly string[];
}[] = [
  {
    label: "التخصيص",
    featureIds: [
      "veil_writing",
      "robe_writing",
      "font_selection",
      "color_selection",
    ],
  },
  {
    label: "الخدمات",
    featureIds: [
      "gift_wrap",
      "luxury_box",
      "express_delivery",
      "gift_message",
    ],
  },
  {
    label: "الشراء",
    featureIds: [
      "appointment_booking",
      "request_design",
      "add_to_cart",
      "buy_now",
      "wishlist",
    ],
  },
];

/**
 * Product Editor — Purchase Experience visibility.
 * Only features valid for the selected Product Type are shown.
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

  const typeInput = useMemo(() => ({ productType }), [productType]);

  const allowedIds = useMemo(
    () => allowedFeatureIdsForProduct(typeInput),
    [typeInput]
  );
  const allowedSet = useMemo(() => new Set(allowedIds), [allowedIds]);

  const defaults = useMemo(
    () => defaultFeatureIdsForProduct(typeInput),
    [typeInput]
  );

  // Drop invalid ids when Product Type changes (never persist impossible combos).
  useEffect(() => {
    if (!value?.use_custom) return;
    const sanitized = sanitizeProductFeaturesConfig(value, typeInput);
    const prev = value.enabled_ids ?? [];
    const next = sanitized?.enabled_ids ?? [];
    const same =
      sanitized?.use_custom === true &&
      prev.length === next.length &&
      prev.every((id, i) => id === next[i]);
    if (same) return;
    onChange(sanitized ?? { use_custom: false, enabled_ids: [] });
  }, [productType]); // eslint-disable-line react-hooks/exhaustive-deps -- type switch only

  const useCustom = Boolean(value?.use_custom);
  const enabledSet = useMemo(() => {
    const ids = useCustom ? (value?.enabled_ids ?? []) : defaults;
    return new Set(ids.filter((id) => allowedSet.has(id)));
  }, [useCustom, value?.enabled_ids, defaults, allowedSet]);

  const byId = useMemo(() => {
    const map = new Map<string, ExperienceFeature>();
    for (const f of library) map.set(f.id, f);
    return map;
  }, [library]);

  const toggle = (id: string, on: boolean) => {
    if (!allowedSet.has(id)) return;
    const base = useCustom
      ? [...(value?.enabled_ids ?? [])]
      : [...defaults];
    const next = new Set(base.filter((x) => allowedSet.has(x)));
    if (on) next.add(id);
    else next.delete(id);
    onChange({ use_custom: true, enabled_ids: [...next] });
  };

  const grouped = useMemo(() => {
    return PURCHASE_EXPERIENCE_GROUPS.map((group) => ({
      label: group.label,
      items: group.featureIds
        .filter((id) => allowedSet.has(id))
        .map((id) => byId.get(id))
        .filter((f): f is ExperienceFeature => Boolean(f)),
    })).filter((g) => g.items.length > 0);
  }, [byId, allowedSet]);

  const knownIds = useMemo(
    () => new Set(PURCHASE_EXPERIENCE_GROUPS.flatMap((g) => g.featureIds)),
    []
  );
  const extraFeatures = useMemo(
    () =>
      library.filter((f) => !knownIds.has(f.id) && allowedSet.has(f.id)),
    [library, knownIds, allowedSet]
  );

  if (loading) {
    return <p className="text-sm text-muted">جاري تحميل الميزات…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-beige-dark bg-beige/20 px-5 py-4">
        <p className="text-sm text-muted">
          تظهر فقط الإجراءات المناسبة لنوع المنتج الحالي. فستان الإيجار يُحجز
          بموعد — بدون سلة أو شراء فوري.
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
        <section
          key={group.label}
          className="rounded-3xl border border-beige-dark/50 bg-white p-5 shadow-[0_8px_24px_rgba(44,36,25,0.05)]"
        >
          <h3 className="mb-4 font-[family-name:var(--font-cormorant)] text-lg tracking-wide text-charcoal">
            {group.label}
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.items.map((f) => {
              const on = enabledSet.has(f.id);
              return (
                <label
                  key={f.id}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-beige-dark bg-ivory/40 px-4 py-3 transition-colors hover:border-gold/30"
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
        </section>
      ))}

      {extraFeatures.length > 0 ? (
        <section className="rounded-3xl border border-beige-dark/50 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-charcoal">أخرى</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {extraFeatures.map((f) => {
              const on = enabledSet.has(f.id);
              return (
                <label
                  key={f.id}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-beige-dark px-4 py-3"
                >
                  <input
                    type="checkbox"
                    className="mt-1 accent-gold"
                    checked={on}
                    onChange={(e) => toggle(f.id, e.target.checked)}
                  />
                  <span className="text-sm font-medium text-charcoal">
                    {f.name_ar || f.name}
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      ) : null}

      {library.length === 0 ? (
        <p className="text-sm text-muted">
          مكتبة الميزات فارغة. أضيفي ميزات من محرك التجربة ← الميزات، أو طبّقي
          ترحيل 040.
        </p>
      ) : null}

      {library.length > 0 && grouped.length === 0 && extraFeatures.length === 0 ? (
        <p className="text-sm text-muted">
          لا توجد ميزات متاحة لهذا النوع من المنتج في المكتبة.
        </p>
      ) : null}

      <ProductExperienceLivePreview
        productType={productType}
        productNameAr="معاينة الإجراءات"
        featuresConfig={
          useCustom
            ? { use_custom: true, enabled_ids: [...enabledSet] }
            : null
        }
        experienceConfig={defaultProductExperienceConfig()}
        compact
        className="mx-auto w-full max-w-md"
      />
    </div>
  );
}
