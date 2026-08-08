"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/LocaleProvider";

export function ExperienceOverviewHome({
  featureCount,
  flowCount,
  templateCount,
}: {
  featureCount: number;
  flowCount: number;
  templateCount: number;
}) {
  const { t } = useLocale();
  const eu = t.admin.experienceUi;

  const cards = [
    {
      href: "/admin/experience/features",
      title: eu.features,
      body: eu.featuresDesc,
    },
    {
      href: "/admin/experience/services",
      title: eu.services,
      body: eu.servicesDesc,
    },
    {
      href: "/admin/experience/product-types",
      title: eu.productTypes,
      body: eu.productTypesDesc,
    },
    {
      href: "/admin/experience/purchase-flows",
      title: eu.purchaseFlows,
      body: eu.purchaseFlowsDesc,
    },
    {
      href: "/admin/experience/templates",
      title: eu.templates,
      body: eu.templatesDesc,
    },
    {
      href: "/admin/experience/preview",
      title: eu.preview,
      body: eu.previewDesc,
    },
  ] as const;

  const stats = [
    { label: eu.features, value: featureCount },
    { label: eu.purchaseFlows, value: flowCount },
    { label: eu.templates, value: templateCount },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
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
        {cards.map((card) => (
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
    </>
  );
}
