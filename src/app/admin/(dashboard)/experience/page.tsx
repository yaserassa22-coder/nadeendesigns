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
    body: "تفعيل لكل منتج من المحرر.",
  },
  {
    href: "/admin/experience/services",
    title: "الخدمات",
    body: "مكتبة الخدمات العامة.",
  },
  {
    href: "/admin/experience/product-types",
    title: "أنواع المنتجات",
    body: "إيجار · إكسسوار · تصميم.",
  },
  {
    href: "/admin/experience/purchase-flows",
    title: "مسارات الشراء",
    body: "أزرار وخطوات الواجهة.",
  },
  {
    href: "/admin/experience/templates",
    title: "القوالب",
    body: "قوالب تجربة المنتج.",
  },
  {
    href: "/admin/experience/preview",
    title: "معاينة",
    body: "سلوك كل نوع على الواجهة.",
  },
] as const;

export default async function ExperienceEngineHomePage() {
  const [features, flows, templates] = await Promise.all([
    listExperienceFeatures(),
    listPurchaseFlows(),
    listExperienceTemplates(),
  ]);

  return (
    <ExperienceEngineShell
      title="محرك التجربة"
      description="ميزات · خدمات · أنواع · مسارات شراء · قوالب."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-beige-dark bg-white px-5 py-4">
          <p className="text-xs text-muted">الميزات</p>
          <p className="mt-1 text-2xl font-semibold text-charcoal">
            {features.length}
          </p>
        </div>
        <div className="rounded-2xl border border-beige-dark bg-white px-5 py-4">
          <p className="text-xs text-muted">مسارات الشراء</p>
          <p className="mt-1 text-2xl font-semibold text-charcoal">
            {flows.length}
          </p>
        </div>
        <div className="rounded-2xl border border-beige-dark bg-white px-5 py-4">
          <p className="text-xs text-muted">القوالب</p>
          <p className="mt-1 text-2xl font-semibold text-charcoal">
            {templates.length}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-beige-dark bg-white px-5 py-5 transition-colors hover:border-gold/40 hover:bg-beige/20"
          >
            <h2 className="text-lg font-semibold text-charcoal">{card.title}</h2>
            <p className="mt-2 text-sm text-muted">{card.body}</p>
          </Link>
        ))}
      </div>
    </ExperienceEngineShell>
  );
}
