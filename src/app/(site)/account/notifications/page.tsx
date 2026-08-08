"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";

import Link from "next/link";
import { useEffect, useState } from "react";

type AccountNotification = {
  id: string;
  title_ar?: string | null;
  body_ar?: string | null;
  title?: string | null;
  body?: string | null;
  message?: string | null;
  href?: string | null;
  is_read?: boolean;
  created_at?: string;
  read_at?: string | null;
};

function notificationTitle(n: AccountNotification, fallback: string) {
  return n.title_ar || n.title || n.message || fallback;
}

function notificationBody(n: AccountNotification) {
  return n.body_ar || n.body || "";
}

export default function AccountNotificationsPage() {
  const { t, locale } = useLocale();
  const [items, setItems] = useState<AccountNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetch("/api/account/notifications")
        .then((r) => r.json())
        .then((d) => setItems(d.notifications ?? []))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading) return <div className="h-40 animate-pulse rounded-2xl bg-beige" />;

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-beige-dark bg-white/60 px-6 py-12 text-center text-sm text-muted">
        {t.account.noNotifications}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((n) => {
        const title = notificationTitle(n, t.account.notificationFallback);
        const body = notificationBody(n);
        const href = n.href?.trim() || null;
        const content = (
          <>
            <p className="font-medium text-charcoal">{title}</p>
            {body ? <p className="text-sm text-muted">{body}</p> : null}
            {n.created_at && (
              <p className="mt-1 text-xs text-muted">
                {new Date(n.created_at).toLocaleString("ar")}
              </p>
            )}
          </>
        );

        if (href) {
          return (
            <Link
              key={n.id}
              href={href}
              className="block rounded-2xl border border-beige-dark bg-white px-5 py-4 transition hover:border-gold/40"
            >
              {content}
            </Link>
          );
        }

        return (
          <div
            key={n.id}
            className="rounded-2xl border border-beige-dark bg-white px-5 py-4"
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
