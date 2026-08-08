import type { Metadata } from "next";
import { ExperienceEngineShell } from "@/components/admin/experience/ExperienceEngineShell";
import { ExperienceOverviewHome } from "@/components/admin/experience/ExperienceOverviewHome";
import { listExperienceFeatures } from "@/lib/products/experience-features";
import { listPurchaseFlows } from "@/lib/products/purchase-flows";
import { listExperienceTemplates } from "@/lib/products/experience-templates";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: getDictionary(locale).admin.experienceUi.overviewTitle };
}

export default async function ExperienceEngineHomePage() {
  const [features, flows, templates] = await Promise.all([
    listExperienceFeatures(),
    listPurchaseFlows(),
    listExperienceTemplates(),
  ]);

  return (
    <ExperienceEngineShell page="overview">
      <ExperienceOverviewHome
        featureCount={features.length}
        flowCount={flows.length}
        templateCount={templates.length}
      />
    </ExperienceEngineShell>
  );
}
