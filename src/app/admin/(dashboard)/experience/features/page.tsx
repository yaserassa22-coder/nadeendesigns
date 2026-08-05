import type { Metadata } from "next";
import { ExperienceEngineShell } from "@/components/admin/experience/ExperienceEngineShell";
import { FeaturesLibraryManager } from "@/components/admin/experience/FeaturesLibraryManager";

export const metadata: Metadata = {
  title: "مكتبة الميزات",
};

export default function ExperienceFeaturesPage() {
  return (
    <ExperienceEngineShell
      title="الميزات"
      description="مكتبة ميزات واحدة قابلة لإعادة الاستخدام. فعّليها لكل منتج من محرر المنتج — تبويب الميزات."
    >
      <FeaturesLibraryManager />
    </ExperienceEngineShell>
  );
}
