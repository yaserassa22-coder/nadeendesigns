import type { Metadata } from "next";
import { ExperienceEngineShell } from "@/components/admin/experience/ExperienceEngineShell";
import { PurchaseFlowsManager } from "@/components/admin/experience/PurchaseFlowsManager";

export const metadata: Metadata = {
  title: "مسارات الشراء",
};

export default function PurchaseFlowsPage() {
  return (
    <ExperienceEngineShell
      title="مسارات الشراء"
      description="اضبطي الزر الأساسي والأزرار الثانوية لكل نوع منتج. الواجهة تتبع هذه المسارات."
    >
      <PurchaseFlowsManager />
    </ExperienceEngineShell>
  );
}
