"use client";

import { useCallback, useEffect, useState } from "react";
import { ADMIN_INBOX_CHANGED_EVENT } from "@/lib/admin/inbox-events";

export type InboxCounts = {
  messages: number;
  bookings: number;
  orders: number;
  total: number;
};

const EMPTY: InboxCounts = {
  messages: 0,
  bookings: 0,
  orders: 0,
  total: 0,
};

export function useAdminInboxCounts() {
  const [counts, setCounts] = useState<InboxCounts>(EMPTY);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/inbox-counts", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as Partial<InboxCounts>;
      setCounts({
        messages: Number(data.messages) || 0,
        bookings: Number(data.bookings) || 0,
        orders: Number(data.orders) || 0,
        total: Number(data.total) || 0,
      });
    } catch {
      /* keep previous */
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refetch();
    }, 0);
    const onFocus = () => {
      void refetch();
    };
    const onChanged = () => {
      void refetch();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener(ADMIN_INBOX_CHANGED_EVENT, onChanged);
    const interval = window.setInterval(() => {
      void refetch();
    }, 60_000);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(ADMIN_INBOX_CHANGED_EVENT, onChanged);
    };
  }, [refetch]);

  return counts;
}
