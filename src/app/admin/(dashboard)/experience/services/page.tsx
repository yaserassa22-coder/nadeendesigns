import type { Metadata } from "next";
import { ExperienceEngineShell } from "@/components/admin/experience/ExperienceEngineShell";
import { ExperienceServicesPanel } from "@/components/admin/experience/ExperienceServicesPanel";

export const metadata: Metadata = {
  title: "خدمات التجربة",
};

export default function ExperienceServicesPage() {
  return (
    <ExperienceEngineShell
      title="الخدمات"
      description="مدير الخدمات العالمية — نفس المكتبة المستخدمة في إعدادات المتجر وتجربة المنتج."
    >
      <ExperienceServicesPanel />
    </ExperienceEngineShell>
  );
}
