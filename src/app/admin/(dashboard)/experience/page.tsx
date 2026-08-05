import type { Metadata } from "next";
import Link from "next/link";
import { ExperienceEngineShell } from "@/components/admin/experience/ExperienceEngineShell";
import { listExperienceFeatures } from "@/lib/products/experience-features";
import { listPurchaseFlows } from "@/lib/products/purchase-flows";
import { listExperienceTemplates } from "@/lib/products/experience-templates";

export const metadata: Metadata = {
  title: "محرك التجربة",
};

const CARDS = [
  {
    href: "/admin/experience/features",
    title: "الميزات",
    body: "فعّلي ما يظهر للعميلة على كل منتج.",
  },
  {
    href: "/admin/experience/services",
    title: "الخدمات",
    body: "تغليف · صندوق فاخر · توصيل سريع.",
  },
  {
    href: "/admin/experience/product-types",
    title: "أنواع المنتجات",
    body: "إيجار · إكسسوار · تصميم خاص.",
  },
  {
    href: "/admin/experience/purchase-flows",
    title: "مسارات الشراء",
    body: "أزرار الشراء وخطوات التجربة.",
  },
  {
    href: "/admin/experience/templates",
    title: "القوالب",
    body: "ابدئي بسرعة من قالب جاهز.",
  },
  {
    href: "/admin/experience/preview",
    title: "معاينة",
    body: "شاهدي سلوك كل نوع قبل النشر.",
  },
] as const;

export default async function ExperienceEngineHomePage() {
  const [features, flows, templates] = await Promise.all([
    listExperienceFeatures(),
    listPurchaseFlows(),
    listExperienceTemplates(),
  ]);

  return (
    <ExperienceEngineShell title="محرك التجربة">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "الميزات", value: features.length },
          { label: "مسارات الشراء", value: flows.length },
          { label: "القوالب", value: templates.length },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-3xl border border-beige-dark/50 bg-white px-6 py-5 shadow-[0_8px_28px_rgba(44,36,25,0.05)]"
          >
            <p className="text-xs text-muted">{stat.label}</p>
            <p className="mt-2 font-[family-name:var(--font-cormorant)] text-3xl text-charcoal">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-3xl border border-beige-dark/50 bg-white px-6 py-6 shadow-[0_8px_28px_rgba(44,36,25,0.05)] transition hover:border-gold/35 hover:shadow-[0_12px_36px_rgba(44,36,25,0.08)]"
          >
            <h2 className="font-[family-name:var(--font-cormorant)] text-xl tracking-wide text-charcoal group-hover:text-gold">
              {card.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{card.body}</p>
          </Link>
        ))}
      </div>
    </ExperienceEngineShell>
  );
}
