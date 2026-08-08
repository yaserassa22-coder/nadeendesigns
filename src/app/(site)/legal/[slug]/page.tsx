import type { Metadata } from "next";
import {
  LegalPolicyPage,
  buildLegalMetadata,
  isLegalSlug,
} from "@/components/legal/LegalPolicyPage";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return [
    { slug: "terms" },
    { slug: "privacy" },
    { slug: "returns" },
    { slug: "shipping" },
  ];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return buildLegalMetadata(slug);
}

export default async function LegalSlugPage({ params }: Props) {
  const { slug } = await params;
  if (!isLegalSlug(slug)) notFound();
  return <LegalPolicyPage slug={slug} />;
}
