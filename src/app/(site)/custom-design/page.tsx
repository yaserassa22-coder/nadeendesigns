import type { Metadata } from "next";
import { PageHero } from "@/components/dresses/DressCatalog";
import { CustomDesignQuestionnaire } from "@/components/forms/CustomDesignQuestionnaire";

export const metadata: Metadata = {
  title: "تصميم فستان خاص",
  description:
    "استشارة تصميم فستان زفاف خاص — أخبِرينا عن رؤيتكِ لنصمم لكِ قطعة حصرية من Nadeen Designs.",
};

export default function CustomDesignPage() {
  return (
    <>
      <PageHero
        title="تصميم فستان خاص"
        description={
          "ليس كل فستان يُصنع ليُرتدى... بعض الفساتين تُصنع لتُخلّد ذكرى.\n\nفي Nadeen Designs نصمم لكِ فستانًا حصريًا يعكس شخصيتكِ، ويُنفذ بعناية فائقة ليكون قطعةً لا تشبه سواها."
        }
      />
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="absolute inset-0 luxury-gradient" />
        <div className="absolute top-20 left-1/4 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />
        <div className="absolute bottom-10 right-1/5 h-72 w-72 rounded-full bg-gold/5 blur-3xl" />

        <div className="relative mx-auto max-w-3xl px-4 md:px-8">
          <CustomDesignQuestionnaire />
        </div>
      </section>
    </>
  );
}
