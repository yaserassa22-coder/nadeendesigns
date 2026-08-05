"use client";

import { Input, Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { StoreExtraService, StoreExtraServiceVisibility } from "@/types/store";
import { PRODUCT_COMMERCE_TYPES } from "@/lib/products/primary-action";

type Props = {
  services: StoreExtraService[];
  onChange: (services: StoreExtraService[]) => void;
};

const SCOPE_OPTIONS: { value: StoreExtraServiceVisibility["scope"]; label: string }[] =
  [
    { value: "all", label: "كل المنتجات" },
    { value: "product_types", label: "حسب نوع المنتج (product_type)" },
    { value: "categories", label: "حسب معرفات التصنيفات" },
    { value: "collections", label: "حسب معرفات المجموعات" },
    { value: "products", label: "حسب معرفات المنتجات" },
  ];

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="accent-[var(--gold)]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function newServiceId(): string {
  return `svc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function emptyService(sort_order: number): StoreExtraService {
  return {
    id: newServiceId(),
    name: "New Service",
    name_ar: "خدمة جديدة",
    description: "",
    description_ar: "",
    pricing_mode: "FREE",
    price: 0,
    enabled: true,
    visible: true,
    required: false,
    default_selected: false,
    available_online: true,
    available_in_store: false,
    sort_order,
    visibility: { scope: "all" },
  };
}

function idsToText(ids?: string[]): string {
  return (ids ?? []).join(", ");
}

function textToIds(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Global Services Manager — create once, assign by ID scopes.
 */
export function GlobalServicesManager({ services, onChange }: Props) {
  const update = (idx: number, patch: Partial<StoreExtraService>) => {
    const next = [...services];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const swap = idx + dir;
    if (swap < 0 || swap >= services.length) return;
    const next = [...services];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange(next.map((s, i) => ({ ...s, sort_order: i })));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          مكتبة خدمات عامة — الظهور عبر معرفات (product_type / category /
          collection / product) بدون أسماء ثابتة.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...services, emptyService(services.length)])}
        >
          إضافة خدمة
        </Button>
      </div>

      {services.map((svc, idx) => (
        <div
          key={svc.id}
          className="space-y-3 rounded-xl border border-beige-dark/70 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-charcoal">{svc.name_ar || svc.name}</p>
              <p className="text-xs text-muted" dir="ltr">
                id: {svc.id}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => move(idx, -1)}>
                ↑
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => move(idx, 1)}>
                ↓
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onChange(services.filter((_, i) => i !== idx))}
              >
                حذف
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="الاسم (عربي)"
              value={svc.name_ar}
              onChange={(e) => update(idx, { name_ar: e.target.value })}
            />
            <Input
              label="Name (EN)"
              dir="ltr"
              value={svc.name}
              onChange={(e) => update(idx, { name: e.target.value })}
            />
          </div>

          <Textarea
            label="الوصف"
            rows={2}
            value={svc.description_ar || ""}
            onChange={(e) =>
              update(idx, {
                description_ar: e.target.value,
                description: svc.description || e.target.value,
              })
            }
          />

          <div>
            <p className="mb-2 text-sm font-medium text-charcoal">وضع التسعير</p>
            <div className="flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`pricing_mode_${svc.id}`}
                  className="accent-[var(--gold)]"
                  checked={svc.pricing_mode === "FREE"}
                  onChange={() =>
                    update(idx, { pricing_mode: "FREE", price: 0 })
                  }
                />
                مجاني
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`pricing_mode_${svc.id}`}
                  className="accent-[var(--gold)]"
                  checked={svc.pricing_mode === "FIXED_PRICE"}
                  onChange={() => update(idx, { pricing_mode: "FIXED_PRICE" })}
                />
                سعر ثابت
              </label>
            </div>
          </div>

          {svc.pricing_mode === "FIXED_PRICE" ? (
            <Input
              label="السعر"
              type="number"
              min={0}
              step="0.01"
              dir="ltr"
              value={svc.price}
              onChange={(e) =>
                update(idx, {
                  pricing_mode: "FIXED_PRICE",
                  price: Math.max(0, Number(e.target.value) || 0),
                })
              }
            />
          ) : null}

          <div className="flex flex-wrap gap-4">
            <Toggle
              label="مفعّل (Enabled)"
              checked={svc.enabled}
              onChange={(v) => update(idx, { enabled: v })}
            />
            <Toggle
              label="ظاهر (Visible)"
              checked={svc.visible !== false}
              onChange={(v) => update(idx, { visible: v })}
            />
            <Toggle
              label="إلزامي (Required)"
              checked={Boolean(svc.required)}
              onChange={(v) =>
                update(idx, {
                  required: v,
                  default_selected: v ? true : svc.default_selected,
                })
              }
            />
            <Toggle
              label="محدد افتراضياً"
              checked={Boolean(svc.default_selected) || Boolean(svc.required)}
              onChange={(v) => update(idx, { default_selected: v })}
            />
            <Toggle
              label="متاح أونلاين"
              checked={svc.available_online !== false}
              onChange={(v) => update(idx, { available_online: v })}
            />
            <Toggle
              label="متاح بالمتجر (مستقبلاً)"
              checked={Boolean(svc.available_in_store)}
              onChange={(v) => update(idx, { available_in_store: v })}
            />
          </div>

          <Select
            label="نطاق الظهور"
            value={svc.visibility?.scope ?? "all"}
            onChange={(e) =>
              update(idx, {
                visibility: {
                  ...(svc.visibility ?? { scope: "all" }),
                  scope: e.target
                    .value as StoreExtraServiceVisibility["scope"],
                },
              })
            }
            options={SCOPE_OPTIONS}
          />

          {svc.visibility?.scope === "product_types" ? (
            <div>
              <p className="mb-2 text-sm font-medium">أنواع المنتج (IDs)</p>
              <div className="flex flex-wrap gap-3">
                {PRODUCT_COMMERCE_TYPES.map((t) => {
                  const checked = (svc.visibility?.product_types ?? []).includes(
                    t
                  );
                  return (
                    <Toggle
                      key={t}
                      label={t}
                      checked={checked}
                      onChange={(v) => {
                        const cur = new Set(svc.visibility?.product_types ?? []);
                        if (v) cur.add(t);
                        else cur.delete(t);
                        update(idx, {
                          visibility: {
                            scope: "product_types",
                            product_types: [...cur],
                          },
                        });
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}

          {svc.visibility?.scope === "categories" ? (
            <Input
              label="معرفات التصنيفات (UUID مفصولة بفاصلة)"
              dir="ltr"
              value={idsToText(svc.visibility.category_ids)}
              onChange={(e) =>
                update(idx, {
                  visibility: {
                    scope: "categories",
                    category_ids: textToIds(e.target.value),
                  },
                })
              }
            />
          ) : null}

          {svc.visibility?.scope === "collections" ? (
            <Input
              label="معرفات المجموعات (UUID مفصولة بفاصلة)"
              dir="ltr"
              value={idsToText(svc.visibility.collection_ids)}
              onChange={(e) =>
                update(idx, {
                  visibility: {
                    scope: "collections",
                    collection_ids: textToIds(e.target.value),
                  },
                })
              }
            />
          ) : null}

          {svc.visibility?.scope === "products" ? (
            <Input
              label="معرفات المنتجات (UUID مفصولة بفاصلة)"
              dir="ltr"
              value={idsToText(svc.visibility.product_ids)}
              onChange={(e) =>
                update(idx, {
                  visibility: {
                    scope: "products",
                    product_ids: textToIds(e.target.value),
                  },
                })
              }
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
