import type { Metadata } from "next";
import { ExperienceEngineShell } from "@/components/admin/experience/ExperienceEngineShell";
import { PurchaseFlowsManager } from "@/components/admin/experience/PurchaseFlowsManager";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: getDictionary(locale).admin.experienceUi.purchaseFlows };
}

export default function PurchaseFlowsPage() {
  return (
    <ExperienceEngineShell page="purchaseFlows">
      <PurchaseFlowsManager />
    </ExperienceEngineShell>
  );
}
