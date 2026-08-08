"use client";

import { Input, Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { StoreExtraService, StoreExtraServiceVisibility } from "@/types/store";
import { PRODUCT_COMMERCE_TYPES } from "@/lib/products/primary-action";
import { useLocale } from "@/components/i18n/LocaleProvider";

type Props = {
  services: StoreExtraService[];
  onChange: (services: StoreExtraService[]) => void;
};

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
  const { t, locale } = useLocale();
  const eu = t.admin.experienceUi;
  const pu = t.admin.productsUi;
  const extraLabels =
    locale === "he"
      ? {
          defaultSelected: "ברירת מחדל",
          online: "זמין אונליין",
          inStore: "זמין בחנות",
          free: "חינם",
          fixed: "מחיר קבוע",
          pricingMode: "מצב תמחור",
        }
      : locale === "en"
        ? {
            defaultSelected: "Default selected",
            online: "Available online",
            inStore: "Available in store",
            free: "Free",
            fixed: "Fixed price",
            pricingMode: "Pricing mode",
          }
        : {
            defaultSelected: "محدد افتراضياً",
            online: "متاح أونلاين",
            inStore: "متاح بالمتجر",
            free: "مجاني",
            fixed: "سعر ثابت",
            pricingMode: "وضع التسعير",
          };

  const SCOPE_OPTIONS: {
    value: StoreExtraServiceVisibility["scope"];
    label: string;
  }[] = [
    { value: "all", label: eu.scopeAll },
    { value: "product_types", label: eu.scopeProductTypes },
    { value: "categories", label: eu.scopeCategories },
    { value: "collections", label: eu.scopeCollections },
    { value: "products", label: eu.scopeProducts },
  ];

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
        <p className="text-sm text-muted">{eu.servicesHint}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...services, emptyService(services.length)])}
        >
          {pu.addNew}
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
                {t.admin.lifecycleUi.softDelete}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label={eu.nameAr}
              value={svc.name_ar}
              onChange={(e) => update(idx, { name_ar: e.target.value })}
            />
            <Input
              label={eu.nameEn}
              dir="ltr"
              value={svc.name}
              onChange={(e) => update(idx, { name: e.target.value })}
            />
          </div>

          <Textarea
            label={pu.description}
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
            <p className="mb-2 text-sm font-medium text-charcoal">
              {extraLabels.pricingMode}
            </p>
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
                {extraLabels.free}
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`pricing_mode_${svc.id}`}
                  className="accent-[var(--gold)]"
                  checked={svc.pricing_mode === "FIXED_PRICE"}
                  onChange={() => update(idx, { pricing_mode: "FIXED_PRICE" })}
                />
                {extraLabels.fixed}
              </label>
            </div>
          </div>

          {svc.pricing_mode === "FIXED_PRICE" ? (
            <Input
              label={pu.price}
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
              label={eu.enabled}
              checked={svc.enabled}
              onChange={(v) => update(idx, { enabled: v })}
            />
            <Toggle
              label={eu.visible}
              checked={svc.visible !== false}
              onChange={(v) => update(idx, { visible: v })}
            />
            <Toggle
              label={eu.required}
              checked={Boolean(svc.required)}
              onChange={(v) =>
                update(idx, {
                  required: v,
                  default_selected: v ? true : svc.default_selected,
                })
              }
            />
            <Toggle
              label={extraLabels.defaultSelected}
              checked={Boolean(svc.default_selected) || Boolean(svc.required)}
              onChange={(v) => update(idx, { default_selected: v })}
            />
            <Toggle
              label={extraLabels.online}
              checked={svc.available_online !== false}
              onChange={(v) => update(idx, { available_online: v })}
            />
            <Toggle
              label={extraLabels.inStore}
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
