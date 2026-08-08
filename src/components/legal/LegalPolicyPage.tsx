import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/dresses/DressCatalog";
import {
  LEGAL_TEMPLATE_DISCLAIMER_AR,
  LEGAL_TEMPLATE_DISCLAIMER_EN,
  LEGAL_TEMPLATE_DISCLAIMER_HE,
} from "@/lib/legal/default-policies";
import { getStoreSettings, getStoreDisplayName } from "@/lib/store/settings";
import type { StoreLegalSettings } from "@/types/store";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n";
import type { Dictionary, Locale } from "@/lib/i18n/types";

export const LEGAL_SLUGS = [
  "terms",
  "privacy",
  "returns",
  "shipping",
] as const;

export type LegalSlug = (typeof LEGAL_SLUGS)[number];

const LEGAL_FIELDS: Record<
  LegalSlug,
  {
    fieldAr: keyof StoreLegalSettings;
    fieldEn: keyof StoreLegalSettings;
    fieldHe: keyof StoreLegalSettings;
  }
> = {
  terms: { fieldAr: "terms_ar", fieldHe: "terms_he", fieldEn: "terms_en" },
  privacy: {
    fieldAr: "privacy_ar",
    fieldHe: "privacy_he",
    fieldEn: "privacy_en",
  },
  returns: {
    fieldAr: "returns_ar",
    fieldHe: "returns_he",
    fieldEn: "returns_en",
  },
  shipping: {
    fieldAr: "shipping_policy_ar",
    fieldHe: "shipping_policy_he",
    fieldEn: "shipping_policy_en",
  },
};

function legalChrome(t: Dictionary, slug: LegalSlug) {
  switch (slug) {
    case "terms":
      return { title: t.legalUi.termsTitle, description: t.legalUi.termsDescription };
    case "privacy":
      return {
        title: t.legalUi.privacyTitle,
        description: t.legalUi.privacyDescription,
      };
    case "returns":
      return {
        title: t.legalUi.returnsTitle,
        description: t.legalUi.returnsDescription,
      };
    case "shipping":
      return {
        title: t.legalUi.shippingTitle,
        description: t.legalUi.shippingDescription,
      };
  }
}

function templateDisclaimer(locale: Locale): string {
  if (locale === "he") return LEGAL_TEMPLATE_DISCLAIMER_HE;
  if (locale === "en") return LEGAL_TEMPLATE_DISCLAIMER_EN;
  return LEGAL_TEMPLATE_DISCLAIMER_AR;
}

function pickLegalBody(
  legal: StoreLegalSettings,
  fields: {
    fieldAr: keyof StoreLegalSettings;
    fieldEn: keyof StoreLegalSettings;
    fieldHe: keyof StoreLegalSettings;
  },
  locale: Locale
): { primary: string; alternateEn: string } {
  const bodyAr = String(legal[fields.fieldAr] ?? "").trim();
  const bodyEn = String(legal[fields.fieldEn] ?? "").trim();
  const bodyHe = String(legal[fields.fieldHe] ?? "").trim();

  if (locale === "en" && bodyEn) {
    return { primary: bodyEn, alternateEn: "" };
  }
  if (locale === "he") {
    if (bodyHe) return { primary: bodyHe, alternateEn: bodyEn };
    return {
      primary: bodyAr || bodyEn,
      alternateEn: bodyEn && bodyAr ? bodyEn : "",
    };
  }
  return { primary: bodyAr, alternateEn: bodyEn };
}

export function isLegalSlug(value: string): value is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(value);
}

export async function buildLegalMetadata(slug: string): Promise<Metadata> {
  const locale = await getLocale();
  const t = getDictionary(locale);
  if (!isLegalSlug(slug)) return { title: t.common.notFound };
  const meta = legalChrome(t, slug);
  const store = await getStoreSettings();
  const name = getStoreDisplayName(store);
  return {
    title: meta.title,
    description: `${meta.description} — ${name}`,
  };
}

export async function LegalPolicyPage({ slug }: { slug: string }) {
  if (!isLegalSlug(slug)) notFound();

  const locale = await getLocale();
  const t = getDictionary(locale);
  const store = await getStoreSettings(true);
  const fields = LEGAL_FIELDS[slug];
  const meta = legalChrome(t, slug);
  const legal = store.legal;
  const { primary, alternateEn } = pickLegalBody(legal, fields, locale);
  const storeName = getStoreDisplayName(store);

  return (
    <>
      <PageHero title={meta.title} description={storeName} />
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          {legal.show_template_banner ? (
            <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-4 text-sm leading-relaxed text-amber-950">
              {templateDisclaimer(locale)}
            </div>
          ) : null}

          <article
            className="space-y-4 whitespace-pre-line text-base leading-relaxed text-charcoal/90"
            lang={locale === "en" ? "en" : locale === "he" ? "he" : "ar"}
            dir={locale === "en" ? "ltr" : "rtl"}
          >
            {primary || t.legalUi.emptyBody}
          </article>

          {alternateEn && locale !== "en" ? (
            <details className="mt-12 rounded-2xl border border-beige-dark bg-white p-5">
              <summary className="cursor-pointer text-sm font-medium text-gold">
                {t.legalUi.englishVersion}
              </summary>
              <div
                className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted"
                dir="ltr"
                lang="en"
              >
                {alternateEn}
              </div>
            </details>
          ) : null}

          <div className="mt-14 flex flex-wrap gap-4 border-t border-beige-dark pt-8 text-sm">
            <Link href="/legal/terms" className="text-gold hover:underline">
              {t.legalUi.navTerms}
            </Link>
            <Link href="/legal/privacy" className="text-gold hover:underline">
              {t.legalUi.navPrivacy}
            </Link>
            <Link href="/legal/returns" className="text-gold hover:underline">
              {t.legalUi.navReturns}
            </Link>
            <Link href="/legal/shipping" className="text-gold hover:underline">
              {t.legalUi.navShipping}
            </Link>
            <Link href="/contact" className="text-gold hover:underline">
              {t.legalUi.navContact}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
