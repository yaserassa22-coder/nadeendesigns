"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin/experience", label: "نظرة عامة", exact: true },
  { href: "/admin/experience/features", label: "الميزات" },
  { href: "/admin/experience/services", label: "الخدمات" },
  { href: "/admin/experience/product-types", label: "أنواع المنتجات" },
  { href: "/admin/experience/purchase-flows", label: "مسارات الشراء" },
  { href: "/admin/experience/templates", label: "القوالب" },
  { href: "/admin/experience/preview", label: "معاينة" },
] as const;

export function ExperienceEngineNav() {
  const pathname = usePathname();

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
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
