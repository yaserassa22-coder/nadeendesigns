"use client";

import type { ReactNode } from "react";
import { ExperienceEngineNav } from "@/components/admin/experience/ExperienceEngineNav";
import { useLocale } from "@/components/i18n/LocaleProvider";

export type ExperienceEnginePage =
  | "overview"
  | "features"
  | "services"
  | "productTypes"
  | "purchaseFlows"
  | "templates"
  | "preview";

function chromeFor(
  page: ExperienceEnginePage,
  eu: ReturnType<typeof useLocale>["t"]["admin"]["experienceUi"]
): { title: string; description?: string } {
  switch (page) {
    case "overview":
      return { title: eu.overviewTitle };
    case "features":
      return { title: eu.features, description: eu.featuresDesc };
    case "services":
      return {
        title: eu.servicesPageTitle,
        description: eu.servicesPageDesc,
      };
    case "productTypes":
      return { title: eu.productTypes, description: eu.productTypesDesc };
    case "purchaseFlows":
      return { title: eu.purchaseFlows, description: eu.purchaseFlowsDesc };
    case "templates":
      return { title: eu.templates, description: eu.templatesDesc };
    case "preview":
      return { title: eu.preview, description: eu.previewDesc };
  }
}

export function ExperienceEngineShell({
  page,
  children,
}: {
  page: ExperienceEnginePage;
  children: ReactNode;
}) {
  const { t, dir } = useLocale();
  const eu = t.admin.experienceUi;
  const { title, description } = chromeFor(page, eu);

  return (
    <div className="space-y-8" dir={dir}>
      <div>
        <p className="text-xs font-medium tracking-wide text-gold">{eu.eyebrow}</p>
        <h1 className="mt-2 font-[family-name:var(--font-cormorant)] text-4xl tracking-wide text-charcoal">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </div>
      <ExperienceEngineNav />
      {children}
    </div>
  );
}
