"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/i18n/LocaleProvider";

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-24 rounded-2xl bg-beige" />
      <div className="h-24 rounded-2xl bg-beige" />
      <div className="h-24 rounded-2xl bg-beige" />
    </div>
  );
}

export function AccountDashboard() {
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<unknown[]>([]);
  const [appointments, setAppointments] = useState<unknown[]>([]);
  const [wishlist, setWishlist] = useState<unknown[]>([]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const [o, a, w] = await Promise.all([
            fetch("/api/account/orders").then((r) => r.json()),
            fetch("/api/account/appointments").then((r) => r.json()),
            fetch("/api/account/wishlist").then((r) => r.json()),
          ]);
          if (cancelled) return;
          setOrders(o.orders ?? []);
          setAppointments(a.appointments ?? []);
          setWishlist(w.items ?? []);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (loading) return <Skeleton />;

  const cards = [
    {
      title: t.account.recentOrders,
      count: orders.length,
      href: "/account/orders",
      empty: t.account.recentOrdersEmpty,
    },
    {
      title: t.account.appointments,
      count: appointments.length,
      href: "/account/appointments",
      empty: t.account.appointmentsEmpty,
    },
    {
      title: t.account.wishlist,
      count: wishlist.length,
      href: "/wishlist",
      empty: t.account.wishlistEmpty,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <Link
          key={c.href}
          href={c.href}
          className="rounded-2xl border border-beige-dark bg-white/80 p-5 shadow-sm transition hover:border-[color:#C9A14A]/50 hover:shadow-md"
        >
          <p className="text-sm text-muted">{c.title}</p>
          <p
            className="mt-2 font-[family-name:var(--font-cormorant)] text-4xl"
            style={{ color: "#C9A14A" }}
          >
            {c.count}
          </p>
          {c.count === 0 && (
            <p className="mt-2 text-xs text-muted">{c.empty}</p>
          )}
        </Link>
      ))}
      <Link
        href="/account/designs"
        className="rounded-2xl border border-dashed border-beige-dark bg-white/50 p-5 sm:col-span-2 lg:col-span-3"
      >
        <p className="text-sm font-medium text-charcoal">{t.account.designs}</p>
        <p className="mt-1 text-xs text-muted">{t.account.designsTeaserHint}</p>
      </Link>
    </div>
  );
}
