import type { Metadata } from "next";
import { ExperienceEngineShell } from "@/components/admin/experience/ExperienceEngineShell";
import { listExperienceTemplates } from "@/lib/products/experience-templates";

export const metadata: Metadata = {
  title: "قوالب التجربة",
};

export default async function ExperienceTemplatesPage() {
  const templates = await listExperienceTemplates();

  return (
    <ExperienceEngineShell
      title="القوالب"
      description="قوالب تجربة المنتج من Sprint 2A. يمكن تطبيقها من تبويب «تجربة المنتج» في محرر المنتج — دون محرك موازٍ."
    >
      {templates.length === 0 ? (
        <p className="text-sm text-muted">
          لا توجد قوالب بعد. طبّقي ترحيل 038 أو أنشئي قالبًا من محرر المنتج.
        </p>
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
                    نظام
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
