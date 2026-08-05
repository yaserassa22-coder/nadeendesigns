"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Copy,
  GripVertical,
  Monitor,
  Pencil,
  Plus,
  Settings2,
  Smartphone,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { GlobalServicesManager } from "@/components/admin/GlobalServicesManager";
import {
  DEFAULT_PERSONALIZATION_UI,
  EXPERIENCE_SECTION_LABELS_AR,
  JOURNEY_SECTION_IDS,
  isCheckoutOnlyExperienceSection,
  moveExperienceSection,
  normalizeProductExperienceConfig,
  reorderJourneySection,
  storefrontExperienceSections,
  type ExperienceSectionConfig,
  type ExperienceSectionId,
  type ExperienceTemplateRow,
  type ProductExperienceConfig,
} from "@/lib/products/experience-designer";
import {
  DEFAULT_ORDER_OPTIONS,
  type ExtraServiceConfig,
  type OrderOptionKey,
} from "@/lib/products/order-experience";
import type { StoreExtraService } from "@/types/store";
import { cn, formatPrice } from "@/lib/utils";

type Props = {
  value: ProductExperienceConfig;
  onChange: (next: ProductExperienceConfig) => void;
  productNameAr?: string;
  supportsPersonalization?: boolean;
  /** Store library services (for cards + manage modal). */
  libraryServices?: ExtraServiceConfig[];
  onLibraryServicesChange?: (services: ExtraServiceConfig[]) => void;
  /** Product-level service override */
  extraServicesUseCustom?: boolean;
  extraServiceIds?: string[];
  onExtraServicesUseCustomChange?: (v: boolean) => void;
  onExtraServiceIdsChange?: (ids: string[]) => void;
  /** Order options (Advanced) */
  orderOptionsUseCustom?: boolean;
  orderOptions?: Record<OrderOptionKey, { enabled: boolean; required: boolean }>;
  onOrderOptionsUseCustomChange?: (v: boolean) => void;
  onOrderOptionsChange?: (
    next: Record<OrderOptionKey, { enabled: boolean; required: boolean }>
  ) => void;
  /** Autosave indicator from product editor */
  savedIndicator?: "idle" | "saving" | "saved" | "failed";
  unitPrice?: number;
};

function Card({
  title,
  children,
  action,
  hint,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  hint?: string;
}) {
  return (
    <section className="rounded-[var(--xp-card-radius)] border border-beige-dark/80 bg-white p-5 shadow-[var(--xp-shadow)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-charcoal">{title}</h3>
          {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function LuxuryToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-beige-dark/70 bg-ivory/50 px-4 py-4 text-start transition hover:border-gold/40"
    >
      <span className="text-sm font-medium text-charcoal">{label}</span>
      <span
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-gold" : "bg-beige-dark"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all",
            checked ? "start-5" : "start-0.5"
          )}
        />
      </span>
    </button>
  );
}

function servicePriceLabel(svc: ExtraServiceConfig): string {
  if (svc.pricing_mode === "FREE" || !svc.price) return "مجاني";
  return `+${formatPrice(svc.price)}`;
}

let localServiceSeq = 0;
function newLocalServiceId(): string {
  localServiceSeq += 1;
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `svc_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `svc_${localServiceSeq.toString(36)}`;
}

/**
 * Product Experience Admin v2 — luxury Shopify-style configuration cards.
 * Serializable config only — no Server→Client callbacks.
 */
export function ExperienceDesignerPanel({
  value,
  onChange,
  productNameAr = "المنتج",
  supportsPersonalization = true,
  libraryServices = [],
  onLibraryServicesChange,
  extraServicesUseCustom = false,
  extraServiceIds = [],
  onExtraServicesUseCustomChange,
  onExtraServiceIdsChange,
  orderOptionsUseCustom = false,
  orderOptions,
  onOrderOptionsUseCustomChange,
  onOrderOptionsChange,
  savedIndicator = "idle",
  unitPrice = 0,
}: Props) {
  const config = normalizeProductExperienceConfig(value);
  const persUi = config.personalization_ui ?? DEFAULT_PERSONALIZATION_UI;
  const persSection = config.sections.find((s) => s.id === "personalization")!;

  const [templates, setTemplates] = useState<ExperienceTemplateRow[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [message, setMessage] = useState("");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">(
    "desktop"
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [manageTemplatesOpen, setManageTemplatesOpen] = useState(false);
  const [servicesModalOpen, setServicesModalOpen] = useState(false);
  const [servicesDraft, setServicesDraft] = useState<StoreExtraService[]>([]);
  const [savingServices, setSavingServices] = useState(false);
  const [dragId, setDragId] = useState<ExperienceSectionId | null>(null);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/experience-templates");
        if (!res.ok) return;
        const data = (await res.json()) as { templates?: ExperienceTemplateRow[] };
        if (!cancelled) setTemplates(data.templates ?? []);
      } catch {
        /* templates optional until migration */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patchSection = (
    id: ExperienceSectionId,
    patch: Partial<ExperienceSectionConfig>
  ) => {
    onChange({
      ...config,
      sections: config.sections.map((s) =>
        s.id === id ? { ...s, ...patch } : s
      ),
    });
  };

  const patchPersUi = (patch: Partial<typeof persUi>) => {
    onChange({
      ...config,
      personalization_ui: { ...persUi, ...patch },
    });
  };

  const applyTemplate = (templateId: string) => {
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    onChange({
      ...normalizeProductExperienceConfig(t.config),
      template_id: t.id,
    });
    setMessage(`تم تطبيق: ${t.name_ar || t.name}`);
  };

  const saveAsTemplate = async () => {
    const name_ar = templateName.trim();
    if (!name_ar) {
      setMessage("أدخلي اسم القالب");
      return;
    }
    setSavingTemplate(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/experience-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name_ar, name_ar, config }),
      });
      const data = (await res.json()) as {
        template?: ExperienceTemplateRow;
        error?: string;
      };
      if (!res.ok || !data.template) {
        setMessage(data.error || "فشل حفظ القالب");
        return;
      }
      setTemplates((prev) => [...prev, data.template!]);
      onChange({ ...config, template_id: data.template.id });
      setTemplateName("");
      setShowSaveTemplate(false);
      setMessage("تم حفظ القالب");
    } catch {
      setMessage("فشل حفظ القالب");
    } finally {
      setSavingTemplate(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const res = await fetch(
        `/api/admin/experience-templates?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        setMessage("تعذّر حذف القالب");
        return;
      }
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (config.template_id === id) {
        onChange({ ...config, template_id: null });
      }
    } catch {
      setMessage("تعذّر حذف القالب");
    }
  };

  const openServicesModal = () => {
    setServicesDraft(
      (libraryServices.length ? libraryServices : []).map((s) => ({
        ...s,
        id: String(s.id),
      })) as StoreExtraService[]
    );
    setServicesModalOpen(true);
  };

  const saveServicesLibrary = async () => {
    setSavingServices(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/store-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: { extra_services: { services: servicesDraft } },
          sections: ["extra_services"],
        }),
      });
      if (!res.ok) {
        setMessage("فشل حفظ الخدمات");
        return;
      }
      const asExtra = servicesDraft as unknown as ExtraServiceConfig[];
      onLibraryServicesChange?.(asExtra);
      setServicesModalOpen(false);
      setMessage("تم حفظ الخدمات");
    } catch {
      setMessage("فشل حفظ الخدمات");
    } finally {
      setSavingServices(false);
    }
  };

  const duplicateService = (svc: ExtraServiceConfig) => {
    const copy: ExtraServiceConfig = {
      ...svc,
      id: newLocalServiceId(),
      name: `${svc.name} Copy`,
      name_ar: `${svc.name_ar || svc.name} (نسخة)`,
      sort_order: libraryServices.length,
    };
    setServicesDraft(
      [...libraryServices, copy] as unknown as StoreExtraService[]
    );
    setServicesModalOpen(true);
  };

  const removeServiceLocal = (id: string) => {
    const next = libraryServices.filter((s) => s.id !== id);
    onLibraryServicesChange?.(next);
    void (async () => {
      try {
        await fetch("/api/admin/store-settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            settings: { extra_services: { services: next } },
            sections: ["extra_services"],
          }),
        });
      } catch {
        setMessage("فشل حذف الخدمة");
      }
    })();
  };

  const journeySections = useMemo(() => {
    return [...config.sections]
      .filter((s) => JOURNEY_SECTION_IDS.includes(s.id))
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [config.sections]);

  const displayedServices = useMemo(() => {
    const enabledLib = libraryServices.filter((s) => s.enabled && s.visible);
    if (!extraServicesUseCustom) return enabledLib;
    return enabledLib.filter((s) => extraServiceIds.includes(s.id));
  }, [libraryServices, extraServicesUseCustom, extraServiceIds]);

  const previewSections = storefrontExperienceSections(config).filter(
    (s) =>
      s.id !== "personalization" ||
      supportsPersonalization ||
      s.enabled
  );

  // savedIndicator retained on Props for callers; footer owns autosave status.
  void savedIndicator;

  return (
    <div className="relative space-y-5">
      {/* 1. Experience Template */}
      <Card
        title="قالب التجربة"
        hint="ابدئي من قالب جاهز — أو احفظي إعداداتكِ الحالية"
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowSaveTemplate((v) => !v)}
            >
              حفظ كقالب
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setManageTemplatesOpen(true)}
            >
              إدارة القوالب
            </Button>
          </div>
        }
      >
        <Select
          label="القالب"
          value={config.template_id ?? ""}
          onChange={(e) => {
            if (e.target.value) applyTemplate(e.target.value);
          }}
          options={[
            { value: "", label: "— اختاري قالباً —" },
            ...templates.map((t) => ({
              value: t.id,
              label: t.name_ar || t.name,
            })),
          ]}
        />
        {showSaveTemplate ? (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <Input
              label="اسم القالب"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="مثال: فستان إيجار"
            />
            <Button
              type="button"
              size="sm"
              loading={savingTemplate}
              onClick={saveAsTemplate}
            >
              حفظ
            </Button>
          </div>
        ) : null}
      </Card>

      {/* 2. Personalization */}
      <Card title="التخصيص">
        <LuxuryToggle
          checked={persSection.enabled}
          onChange={(enabled) => patchSection("personalization", { enabled })}
          label="تفعيل التخصيص"
        />
        {persSection.enabled ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input
              label="عنوان القسم"
              value={persSection.title_ar}
              onChange={(e) =>
                patchSection("personalization", { title_ar: e.target.value })
              }
            />
            <Input
              label="الحد الأقصى للأحرف"
              type="number"
              min={1}
              max={200}
              dir="ltr"
              value={String(persUi.max_characters)}
              onChange={(e) =>
                patchPersUi({
                  max_characters: Math.max(1, Number(e.target.value) || 1),
                })
              }
            />
            <div className="sm:col-span-2">
              <Textarea
                label="الوصف"
                rows={2}
                value={persSection.description_ar}
                onChange={(e) =>
                  patchSection("personalization", {
                    description_ar: e.target.value,
                  })
                }
              />
            </div>
            <Input
              label="سعر إضافي"
              type="number"
              min={0}
              step="0.01"
              dir="ltr"
              value={String(persUi.extra_price)}
              onChange={(e) =>
                patchPersUi({
                  extra_price: Math.max(0, Number(e.target.value) || 0),
                })
              }
            />
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input
                type="checkbox"
                className="accent-gold"
                checked={persUi.required}
                onChange={(e) => patchPersUi({ required: e.target.checked })}
              />
              إلزامي
            </label>
            <div className="sm:col-span-2 rounded-xl border border-gold/25 bg-ivory/70 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gold">
                <Sparkles className="h-3.5 w-3.5" /> معاينة
              </p>
              <p className="font-medium text-charcoal">
                {persSection.title_ar || "التخصيص"}
              </p>
              {persSection.description_ar ? (
                <p className="mt-1 text-xs text-muted">
                  {persSection.description_ar}
                </p>
              ) : null}
              <div className="mt-3 h-9 rounded-lg border border-dashed border-beige-dark bg-white px-3 text-xs leading-9 text-muted">
                نص التخصيص · حتى {persUi.max_characters} حرف
              </div>
              {persUi.extra_price > 0 ? (
                <p className="mt-2 text-xs text-gold" dir="ltr">
                  +{formatPrice(persUi.extra_price)}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </Card>

      {/* 3. Extra Services */}
      <Card
        title="خدمات إضافية"
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={openServicesModal}
            >
              إدارة الخدمات
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                openServicesModal();
                setServicesDraft((prev) => [
                  ...prev,
                  {
                    id: newLocalServiceId(),
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
                    sort_order: prev.length,
                    visibility: { scope: "all" },
                  },
                ]);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              خدمة جديدة
            </Button>
          </div>
        }
      >
        {onExtraServicesUseCustomChange ? (
          <label className="mb-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-gold"
              checked={extraServicesUseCustom}
              onChange={(e) =>
                onExtraServicesUseCustomChange(e.target.checked)
              }
            />
            تخصيص لهذا المنتج
          </label>
        ) : null}

        {displayedServices.length === 0 && !extraServicesUseCustom ? (
          <p className="text-sm text-muted">لا توجد خدمات مفعّلة بعد.</p>
        ) : null}

        {extraServicesUseCustom ? (
          <div className="mb-3 space-y-2">
            {libraryServices.map((svc) => {
              const checked = extraServiceIds.includes(svc.id);
              return (
                <label
                  key={svc.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-beige-dark/60 px-3 py-2.5 text-sm"
                >
                  <span>{svc.name_ar || svc.name}</span>
                  <input
                    type="checkbox"
                    className="accent-gold"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...extraServiceIds, svc.id]
                        : extraServiceIds.filter((id) => id !== svc.id);
                      onExtraServiceIdsChange?.(next);
                    }}
                  />
                </label>
              );
            })}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {(extraServicesUseCustom
            ? libraryServices.filter((s) => extraServiceIds.includes(s.id))
            : displayedServices
          ).map((svc) => (
            <div
              key={svc.id}
              className="rounded-xl border border-beige-dark/70 bg-ivory/40 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/15 text-gold">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-charcoal">
                      {svc.name_ar || svc.name}
                    </p>
                    <p className="text-xs text-gold">{servicePriceLabel(svc)}</p>
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    svc.enabled
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-beige text-muted"
                  )}
                >
                  {svc.enabled ? "مفعّل" : "معطّل"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted">
                {svc.required ? <span>إلزامي</span> : null}
                {svc.default_selected ? <span>· محدد افتراضياً</span> : null}
                {svc.available_online ? <span>· أونلاين</span> : null}
                {svc.available_in_store ? <span>· بالمتجر</span> : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={openServicesModal}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => duplicateService(svc)}
                >
                  <Copy className="h-3.5 w-3.5" />
                  نسخ
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeServiceLocal(String(svc.id))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  حذف
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 4. Customer Journey */}
      <Card title="رحلة العميل">
        <div className="space-y-2">
          {journeySections.map((section, index) => (
            <div
              key={section.id}
              draggable
              onDragStart={() => setDragId(section.id)}
              onDragEnd={() => setDragId(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (!dragId) return;
                onChange({
                  ...config,
                  sections: reorderJourneySection(
                    config.sections,
                    dragId,
                    section.id
                  ),
                });
                setDragId(null);
              }}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-white px-3 py-3 transition",
                dragId === section.id
                  ? "border-gold bg-gold/5 opacity-80"
                  : "border-beige-dark/70",
                !section.enabled ? "opacity-50" : ""
              )}
            >
              <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted" />
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-beige text-xs font-semibold text-charcoal">
                {index + 1}
              </span>
              <span className="flex-1 text-sm font-medium text-charcoal">
                {section.title_ar ||
                  EXPERIENCE_SECTION_LABELS_AR[section.id]}
              </span>
              <label className="flex items-center gap-1.5 text-xs text-muted">
                <input
                  type="checkbox"
                  className="accent-gold"
                  checked={section.enabled}
                  onChange={(e) =>
                    patchSection(section.id, { enabled: e.target.checked })
                  }
                />
                ظاهر
              </label>
            </div>
          ))}
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-gold/40 bg-gold/5 px-3 py-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold text-xs font-semibold text-white">
              {journeySections.filter((s) => s.enabled).length + 1}
            </span>
            <span className="text-sm font-medium text-charcoal">الدفع</span>
            <span className="ms-auto text-[10px] text-muted">ثابت</span>
          </div>
        </div>
      </Card>

      {/* 5. Live Preview — collapsed by default */}
      <section className="rounded-2xl border border-beige-dark/60 bg-white">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-start"
          onClick={() => setPreviewOpen((v) => !v)}
        >
          <span className="text-base font-semibold text-charcoal">
            معاينة مباشرة
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted transition-transform",
              previewOpen ? "rotate-180" : ""
            )}
          />
        </button>
        {previewOpen ? (
          <div className="space-y-4 border-t border-beige-dark/50 px-5 pb-5 pt-4">
            <div className="flex rounded-full border border-beige-dark p-0.5 w-fit">
              <button
                type="button"
                onClick={() => setPreviewMode("desktop")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs transition",
                  previewMode === "desktop"
                    ? "bg-gold text-white"
                    : "text-muted hover:text-charcoal"
                )}
              >
                <Monitor className="h-3.5 w-3.5" />
                سطح المكتب
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("mobile")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs transition",
                  previewMode === "mobile"
                    ? "bg-gold text-white"
                    : "text-muted hover:text-charcoal"
                )}
              >
                <Smartphone className="h-3.5 w-3.5" />
                جوال
              </button>
            </div>
            <div
              className={cn(
                "mx-auto rounded-2xl border border-gold/30 bg-gradient-to-b from-ivory to-white p-4 shadow-inner transition-all",
                previewMode === "mobile" ? "max-w-[320px]" : "max-w-full"
              )}
            >
              <p className="mb-3 text-xs text-gold">{productNameAr}</p>
              <ol className="space-y-2">
                {previewSections.map((s, i) => (
                  <li
                    key={s.id}
                    className="rounded-xl border border-beige-dark/50 bg-white px-3 py-2.5 text-sm"
                  >
                    <span className="font-medium text-charcoal">
                      {i + 1}.{" "}
                      {s.title_ar || EXPERIENCE_SECTION_LABELS_AR[s.id]}
                    </span>
                    {s.id === "personalization" && persUi.extra_price > 0 ? (
                      <span className="ms-2 text-xs text-gold" dir="ltr">
                        +{formatPrice(persUi.extra_price)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
              <div className="mt-4 space-y-2 border-t border-beige-dark/50 pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">الإجمالي</span>
                  <span
                    className="font-semibold text-gold transition-all"
                    dir="ltr"
                  >
                    {formatPrice(
                      Math.max(0, unitPrice) +
                        (persSection.enabled ? persUi.extra_price : 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* 6. Advanced Settings (collapsed) */}
      <section className="rounded-2xl border border-beige-dark/60 bg-beige/20">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-start"
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-charcoal">
            <Settings2 className="h-4 w-4 text-muted" />
            المزيد من الخيارات
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted transition-transform",
              advancedOpen ? "rotate-180" : ""
            )}
          />
        </button>
        {advancedOpen ? (
          <div className="space-y-5 border-t border-beige-dark/50 px-5 py-4">
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted">تعديل عناوين الأقسام</p>
              {journeySections.map((section) => (
                <div
                  key={section.id}
                  className="grid gap-2 rounded-xl border border-beige-dark/50 bg-white p-3 sm:grid-cols-2"
                >
                  <Input
                    label={`${EXPERIENCE_SECTION_LABELS_AR[section.id]} (عربي)`}
                    value={section.title_ar}
                    onChange={(e) =>
                      patchSection(section.id, { title_ar: e.target.value })
                    }
                  />
                  <Input
                    label="Title (EN)"
                    dir="ltr"
                    value={section.title}
                    onChange={(e) =>
                      patchSection(section.id, { title: e.target.value })
                    }
                  />
                  <Textarea
                    label="وصف"
                    rows={2}
                    value={section.description_ar}
                    onChange={(e) =>
                      patchSection(section.id, {
                        description_ar: e.target.value,
                      })
                    }
                  />
                  <label className="flex items-center gap-2 self-end pb-2 text-sm">
                    <input
                      type="checkbox"
                      className="accent-gold"
                      checked={section.collapsed}
                      onChange={(e) =>
                        patchSection(section.id, {
                          collapsed: e.target.checked,
                        })
                      }
                    />
                    مطوي افتراضياً
                  </label>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium text-muted">
                أقسام عند الدفع فقط
              </p>
              {config.sections
                .filter((s) => isCheckoutOnlyExperienceSection(s.id))
                .map((section) => (
                  <div
                    key={section.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-beige-dark/50 bg-white px-3 py-2"
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="accent-gold"
                        checked={section.enabled}
                        onChange={(e) =>
                          patchSection(section.id, {
                            enabled: e.target.checked,
                          })
                        }
                      />
                      {EXPERIENCE_SECTION_LABELS_AR[section.id]}
                    </label>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          onChange({
                            ...config,
                            sections: moveExperienceSection(
                              config.sections,
                              section.id,
                              "up"
                            ),
                          })
                        }
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          onChange({
                            ...config,
                            sections: moveExperienceSection(
                              config.sections,
                              section.id,
                              "down"
                            ),
                          })
                        }
                      >
                        ↓
                      </Button>
                    </div>
                  </div>
                ))}
            </div>

            {orderOptions && onOrderOptionsChange ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted">خيارات الطلب</p>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="accent-gold"
                      checked={orderOptionsUseCustom}
                      onChange={(e) =>
                        onOrderOptionsUseCustomChange?.(e.target.checked)
                      }
                    />
                    تخصيص لهذا المنتج
                  </label>
                </div>
                {orderOptionsUseCustom ? (
                  <div className="space-y-2">
                    {DEFAULT_ORDER_OPTIONS.map((opt) => {
                      const row = orderOptions[opt.key];
                      return (
                        <div
                          key={opt.key}
                          className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-2"
                        >
                          <span className="text-sm">{opt.label_ar}</span>
                          <div className="flex items-center gap-4 text-sm">
                            <label className="flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                className="accent-gold"
                                checked={row.enabled}
                                onChange={(e) =>
                                  onOrderOptionsChange({
                                    ...orderOptions,
                                    [opt.key]: {
                                      ...row,
                                      enabled: e.target.checked,
                                    },
                                  })
                                }
                              />
                              مفعّل
                            </label>
                            <label className="flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                className="accent-gold"
                                checked={row.required}
                                disabled={!row.enabled}
                                onChange={(e) =>
                                  onOrderOptionsChange({
                                    ...orderOptions,
                                    [opt.key]: {
                                      ...row,
                                      required: e.target.checked,
                                    },
                                  })
                                }
                              />
                              إلزامي
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted">يُستخدم إعداد المتجر.</p>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {message ? (
        <p className="text-sm text-gold" role="status">
          {message}
        </p>
      ) : null}

      {/* Manage Templates modal */}
      {manageTemplatesOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-charcoal/40 p-4">
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="font-semibold text-charcoal">إدارة القوالب</h4>
              <button
                type="button"
                onClick={() => setManageTemplatesOpen(false)}
                className="rounded-full p-1.5 text-muted hover:bg-beige"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-2">
              {templates.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-beige-dark/60 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {t.name_ar || t.name}
                    </p>
                    {t.is_system ? (
                      <p className="text-[10px] text-muted">قالب نظام</p>
                    ) : null}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        applyTemplate(t.id);
                        setManageTemplatesOpen(false);
                      }}
                    >
                      تطبيق
                    </Button>
                    {!t.is_system ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => void deleteTemplate(t.id)}
                      >
                        حذف
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {/* Manage Services modal */}
      {servicesModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-charcoal/40 p-4">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-beige-dark/60 px-5 py-4">
              <h4 className="font-semibold text-charcoal">إدارة الخدمات</h4>
              <button
                type="button"
                onClick={() => setServicesModalOpen(false)}
                className="rounded-full p-1.5 text-muted hover:bg-beige"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <GlobalServicesManager
                services={servicesDraft}
                onChange={setServicesDraft}
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-beige-dark/60 px-5 py-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setServicesModalOpen(false)}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                loading={savingServices}
                onClick={() => void saveServicesLibrary()}
              >
                حفظ الخدمات
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
