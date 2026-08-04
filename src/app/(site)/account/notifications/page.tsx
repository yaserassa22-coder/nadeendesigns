"use client";

import { useEffect, useState } from "react";

export default function AccountNotificationsPage() {
  const [items, setItems] = useState<
    { id: string; title?: string; body?: string; created_at?: string; read_at?: string | null }[]
  >([]);
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
        لا إشعارات حالياً.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((n) => (
        <div
          key={n.id}
          className="rounded-2xl border border-beige-dark bg-white px-5 py-4"
        >
          <p className="font-medium text-charcoal">
            {(n as { title?: string }).title ||
              (n as { message?: string }).message ||
              "إشعار"}
          </p>
          <p className="text-sm text-muted">
            {(n as { body?: string }).body || ""}
          </p>
          {n.created_at && (
            <p className="mt-1 text-xs text-muted">
              {new Date(n.created_at).toLocaleString("ar")}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
