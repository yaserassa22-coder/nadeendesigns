"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import {
  moveExperienceSection,
  normalizeProductExperienceConfig,
  type ExperienceSectionConfig,
  type ExperienceSectionId,
  type ExperienceTemplateRow,
  type ProductExperienceConfig,
} from "@/lib/products/experience-designer";

type Props = {
  value: ProductExperienceConfig;
  onChange: (next: ProductExperienceConfig) => void;
  /** Live preview context labels */
  productNameAr?: string;
  supportsPersonalization?: boolean;
};

/**
 * Per-product Experience Designer + templates + instant preview.
 * Serializable config only — no Server→Client callbacks.
 */
export function ExperienceDesignerPanel({
  value,
  onChange,
  productNameAr = "المنتج",
  supportsPersonalization = false,
}: Props) {
  const config = normalizeProductExperienceConfig(value);
  const [templates, setTemplates] = useState<ExperienceTemplateRow[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [message, setMessage] = useState("");

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

  const applyTemplate = (templateId: string) => {
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    onChange({
      ...normalizeProductExperienceConfig(t.config),
      template_id: t.id,
    });
    setMessage(`تم تطبيق قالب: ${t.name_ar || t.name}`);
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
        body: JSON.stringify({
          name: name_ar,
          name_ar,
          config,
        }),
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
      setMessage("تم حفظ القالب");
    } catch {
      setMessage("فشل حفظ القالب");
    } finally {
      setSavingTemplate(false);
    }
  };

  const sorted = [...config.sections].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="font-medium text-foreground">قوالب التجربة</h3>
        <div className="flex flex-wrap gap-2">
          <Select
            label="تطبيق قالب"
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
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Input
            label="حفظ كقالب جديد"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="مثال: هدية فاخرة"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            loading={savingTemplate}
            onClick={saveAsTemplate}
          >
            حفظ القالب
          </Button>
        </div>
        {message ? (
          <p className="text-sm text-gold" role="status">
            {message}
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="font-medium text-foreground">ترتيب الأقسام</h3>
        <p className="text-xs text-muted">
          فعّلي/عطّلي الأقسام، خصصي العنوان، وغيّري الترتيب. المعاينة تتحدث فوراً.
        </p>
        <div className="space-y-3">
          {sorted.map((section) => (
            <div
              key={section.id}
              className="space-y-2 rounded-xl border border-beige-dark/70 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    className="accent-gold"
                    checked={section.enabled}
                    onChange={(e) =>
                      patchSection(section.id, { enabled: e.target.checked })
                    }
                  />
                  {section.title_ar || section.id}
                  <span className="text-xs text-muted" dir="ltr">
                    ({section.id})
                  </span>
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
              {section.enabled ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    label="العنوان (عربي)"
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
                    label="وصف القسم"
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
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-medium text-foreground">معاينة فورية</h3>
        <div className="rounded-2xl border border-gold/30 bg-ivory/60 p-4">
          <p className="mb-3 text-xs text-gold">تجربة المنتج · {productNameAr}</p>
          <ol className="space-y-2">
            {sorted
              .filter((s) => s.enabled)
              .filter(
                (s) =>
                  s.id !== "personalization" || supportsPersonalization || s.enabled
              )
              .map((s, i) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-beige-dark/60 bg-white px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-charcoal">
                      {i + 1}. {s.title_ar || s.title || s.id}
                    </span>
                    {s.collapsed ? (
                      <span className="text-xs text-muted">مطوي</span>
                    ) : (
                      <span className="text-xs text-gold">مفتوح</span>
                    )}
                  </div>
                  {s.description_ar ? (
                    <p className="mt-1 text-xs text-muted">{s.description_ar}</p>
                  ) : null}
                </li>
              ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
