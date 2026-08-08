import type { Metadata } from "next";
import { ExperienceEngineShell } from "@/components/admin/experience/ExperienceEngineShell";
import { FeaturesLibraryManager } from "@/components/admin/experience/FeaturesLibraryManager";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: getDictionary(locale).admin.experienceUi.features };
}

export default function ExperienceFeaturesPage() {
  return (
    <ExperienceEngineShell page="features">
      <FeaturesLibraryManager />
    </ExperienceEngineShell>
  );
}
