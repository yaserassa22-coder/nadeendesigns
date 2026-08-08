import type { Metadata } from "next";
import { ExperienceEngineShell } from "@/components/admin/experience/ExperienceEngineShell";
import { ExperienceServicesPanel } from "@/components/admin/experience/ExperienceServicesPanel";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: getDictionary(locale).admin.experienceUi.servicesPageTitle };
}

export default function ExperienceServicesPage() {
  return (
    <ExperienceEngineShell page="services">
      <ExperienceServicesPanel />
    </ExperienceEngineShell>
  );
}
