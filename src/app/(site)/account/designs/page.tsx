"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AccountDesignsPage() {
  const { t, locale } = useLocale();
  const [designs, setDesigns] = useState<
    { id: string; title?: string; preview_url?: string | null; updated_at?: string }[]
  >([]);
  const [stub, setStub] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetch("/api/account/designs")
        .then((r) => r.json())
        .then((d) => {
          setDesigns(d.designs ?? []);
          setStub(Boolean(d.stub));
        })
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading) return <div className="h-40 animate-pulse rounded-2xl bg-beige" />;

  return (
    <div className="space-y-4">
      {(stub || !designs.length) && (
        <div className="rounded-2xl border border-dashed border-beige-dark bg-white/60 px-6 py-10 text-center">
          <p className="font-[family-name:var(--font-amiri)] text-xl text-charcoal">
            {t.account.noDesigns}
          </p>
          <p className="mt-2 text-sm text-muted">
            {t.account.noDesignsHint}
          </p>
          <Link
            href="/custom-design"
            className="mt-4 inline-block text-sm"
            style={{ color: "#C9A14A" }}
          >
            {t.nav.customDesign}
          </Link>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {designs.map((d) => (
          <div
            key={d.id}
            className="rounded-2xl border border-beige-dark bg-white p-4"
          >
            <p className="font-medium">{d.title || t.account.designFallback}</p>
            <p className="text-xs text-muted">{d.updated_at}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
