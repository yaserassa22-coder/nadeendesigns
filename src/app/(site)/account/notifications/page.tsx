"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { formatDate } from "@/lib/utils";

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
  const { t } = useLocale();
  const [items, setItems] = useState<AccountNotification[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/account/notifications", {
      credentials: "same-origin",
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    setItems(data.notifications ?? []);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function clearOne(id: string) {
    const prev = items;
    setItems((cur) => cur.filter((n) => n.id !== id));
    const res = await fetch("/api/account/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id }),
    });
    if (!res.ok) setItems(prev);
  }

  async function clearAll() {
    if (!items.length) return;
    const prev = items;
    const ids = items.map((n) => n.id);
    setItems([]);
    const res = await fetch("/api/account/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ clearAll: true, ids }),
    });
    if (!res.ok) setItems(prev);
  }

  if (loading) return <div className="h-40 animate-pulse rounded-2xl bg-beige" />;

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-beige-dark bg-white/60 px-6 py-12 text-center text-sm text-muted">
        {t.account.noNotifications}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void clearAll()}
          className="text-xs text-muted hover:text-charcoal hover:underline"
        >
          {t.notificationsUi.clearAll}
        </button>
      </div>
      {items.map((n) => {
        const title = notificationTitle(n, t.account.notificationFallback);
        const body = notificationBody(n);
        const href = n.href?.trim() || null;
        const content = (
          <>
            <p className="font-medium text-charcoal pe-8">{title}</p>
            {body ? <p className="text-sm text-muted pe-8">{body}</p> : null}
            {n.created_at && (
              <p className="mt-1 text-xs text-muted">
                {formatDate(n.created_at)}
              </p>
            )}
          </>
        );

        return (
          <div
            key={n.id}
            className="relative rounded-2xl border border-beige-dark bg-white px-5 py-4"
          >
            {href ? (
              <Link
                href={href}
                className="block transition hover:text-gold"
              >
                {content}
              </Link>
            ) : (
              content
            )}
            <button
              type="button"
              aria-label={t.notificationsUi.clearAria}
              title={t.notificationsUi.clear}
              onClick={() => void clearOne(n.id)}
              className="absolute end-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-beige hover:text-charcoal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
