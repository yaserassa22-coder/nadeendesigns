"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/LocaleProvider";

const LINKS = [
  { href: "/admin/experience", key: "overview" as const, exact: true },
  { href: "/admin/experience/features", key: "features" as const },
  { href: "/admin/experience/services", key: "services" as const },
  { href: "/admin/experience/product-types", key: "productTypes" as const },
  { href: "/admin/experience/purchase-flows", key: "purchaseFlows" as const },
  { href: "/admin/experience/templates", key: "templates" as const },
  { href: "/admin/experience/preview", key: "preview" as const },
] as const;

export function ExperienceEngineNav() {
  const pathname = usePathname();
  const { t } = useLocale();
  const eu = t.admin.experienceUi;

  const labelFor = (key: (typeof LINKS)[number]["key"]) => {
    switch (key) {
      case "overview":
        return eu.overview;
      case "features":
        return eu.features;
      case "services":
        return eu.services;
      case "productTypes":
        return eu.productTypes;
      case "purchaseFlows":
        return eu.purchaseFlows;
      case "templates":
        return eu.templates;
      case "preview":
        return eu.preview;
    }
  };

  return (
    <nav className="flex flex-wrap gap-2 border-b border-beige-dark pb-4">
      {LINKS.map((link) => {
        const exact = "exact" in link && link.exact;
        const active = exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-gold text-white"
                : "bg-beige/50 text-charcoal hover:bg-beige"
            )}
          >
            {labelFor(link.key)}
          </Link>
        );
      })}
    </nav>
  );
}
