import type { Metadata } from "next";
import { ExperienceEngineShell } from "@/components/admin/experience/ExperienceEngineShell";
import { listExperienceTemplates } from "@/lib/products/experience-templates";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: getDictionary(locale).admin.experienceUi.templates };
}

export default async function ExperienceTemplatesPage() {
  const templates = await listExperienceTemplates();
  const locale = await getLocale();
  const eu = getDictionary(locale).admin.experienceUi;

  return (
    <ExperienceEngineShell page="templates">
      {templates.length === 0 ? (
        <p className="text-sm text-muted">{eu.templatesDesc}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-beige-dark bg-white px-5 py-5"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-charcoal">
                  {t.name_ar || t.name}
                </h2>
                {t.is_system ? (
                  <span className="rounded-full bg-beige px-2 py-0.5 text-[10px] text-muted">
                    system
                  </span>
                ) : null}
              </div>
              {t.description_ar ? (
                <p className="mt-2 text-sm text-muted">{t.description_ar}</p>
              ) : null}
              <p className="mt-3 text-xs text-muted" dir="ltr">
                slug: {t.slug ?? "—"} · sections:{" "}
                {t.config.sections?.filter((s) => s.enabled).length ?? 0}{" "}
                enabled
              </p>
            </div>
          ))}
        </div>
      )}
    </ExperienceEngineShell>
  );
}
