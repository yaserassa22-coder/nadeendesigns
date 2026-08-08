"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getShopOrderStatusLabel } from "@/lib/i18n";
import type { ShopOrderStatus } from "@/types/shop";

type Order = {
  id: string;
  status?: string;
  total?: number;
  created_at?: string;
  payment_status?: string;
  tracking_number?: string | null;
};

export default function AccountOrdersPage() {
  const { t, locale } = useLocale();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetch("/api/account/orders")
        .then((r) => r.json())
        .then((d) => setOrders(d.orders ?? []))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-beige" />;
  }

  if (!orders.length) {
    return (
      <Empty
        title={t.account.ordersEmptyTitle}
        hint={t.account.ordersEmptyHint}
      />
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <div
          key={o.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-beige-dark bg-white px-5 py-4"
        >
          <div>
            <p className="font-medium text-charcoal" dir="ltr">
              #{o.id.slice(0, 8)}
            </p>
            <p className="text-xs text-muted">
              {o.created_at
                ? new Date(o.created_at).toLocaleDateString(locale === "he" ? "he" : locale === "en" ? "en" : "ar")
                : ""}{" "}
              · {o.status
                ? getShopOrderStatusLabel(o.status as ShopOrderStatus, locale)
                : "—"}
              {o.tracking_number ? ` · ${t.account.tracking}: ${o.tracking_number}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: "#C9A14A" }}>
              {typeof o.total === "number" ? `${o.total} ₪` : ""}
            </span>
            <Link
              href={`/orders/${o.id}`}
              className="rounded-xl border border-beige-dark px-3 py-1.5 text-sm hover:border-[color:#C9A14A]"
            >{t.account.viewTrack}</Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-beige-dark bg-white/60 px-6 py-12 text-center">
      <p className="font-[family-name:var(--font-amiri)] text-xl text-charcoal">
        {title}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{hint}</p>
    </div>
  );
}
