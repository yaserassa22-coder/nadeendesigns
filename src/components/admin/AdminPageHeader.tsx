"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { localizedName } from "@/lib/i18n";
import type { LocalizableNamed } from "@/lib/i18n";

type CategoryLike = LocalizableNamed & { name_ar: string };

/**
 * Client page chrome so titles follow the live locale (not stale RSC HTML).
 */
export function AdminPageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  const { dir } = useLocale();
  return (
    <div className="space-y-6" dir={dir}>
      <div>
        <h1 className="text-3xl font-bold text-charcoal">{title}</h1>
        {subtitle ? <p className="mt-2 text-muted">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

/** Products admin header — always resolves from the active dictionary. */
export function AdminProductsPageHeader({
  categories,
  children,
}: {
  categories?: CategoryLike[];
  children?: ReactNode;
}) {
  const { t, locale, dir } = useLocale();
  const title = t.admin.productsUi.pageTitle;
  const fromCategories =
    categories
      ?.map((c) => localizedName(c, locale, c.name_ar))
      .filter(Boolean)
      .join(" · ") ?? "";
  const subtitle = fromCategories || t.admin.productsUi.pageSubtitle;

  return (
    <div className="space-y-6" dir={dir}>
      <div>
        <h1 className="text-3xl font-bold text-charcoal">{title}</h1>
        <p className="mt-2 text-muted">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
