"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CustomerNotification } from "@/lib/notifications/in-app";

const LAST_ORDER_KEY = "nadeen_last_order";

function readLastOrderMeta(): { orderId?: string; customerKey?: string } {
  try {
    const raw = sessionStorage.getItem(LAST_ORDER_KEY);
    if (!raw) return {};
    const order = JSON.parse(raw) as {
      id?: string;
      email?: string | null;
      phone?: string;
    };
    return {
      orderId: order.id,
      customerKey: order.email?.trim() || order.phone?.trim() || undefined,
    };
  } catch {
    return {};
  }
}

export function NotificationCenter({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CustomerNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    const meta = readLastOrderMeta();
    if (!meta.orderId && !meta.customerKey) {
      setItems([]);
      setUnread(0);
      return;
    }
    const params = new URLSearchParams();
    if (meta.orderId) params.set("orderId", meta.orderId);
    if (meta.customerKey) params.set("customerKey", meta.customerKey);
    try {
      const res = await fetch(`/api/notifications/customer?${params}`);
      const data = await res.json();
      if (!res.ok) return;
      setItems(data.notifications ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
    const onStorage = () => void load();
    window.addEventListener("storage", onStorage);
    const t = window.setInterval(() => void load(), 45_000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(t);
    };
  }, [load]);

  const markRead = async (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnread((u) => Math.max(0, u - 1));
    await fetch("/api/notifications/customer", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  };

  const markAll = async () => {
    const meta = readLastOrderMeta();
    if (!meta.orderId) return;
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
    await fetch("/api/notifications/customer", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true, orderId: meta.orderId }),
    });
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          void load();
        }}
        className="relative rounded-full p-2 text-charcoal/80 transition-colors hover:text-gold"
        aria-label="الإشعارات"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="إغلاق"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-full end-0 z-50 mt-2 w-[min(92vw,22rem)] overflow-hidden rounded-2xl border border-beige-dark bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-beige-dark px-4 py-3">
              <p className="text-sm font-semibold text-charcoal">الإشعارات</p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => void markAll()}
                  className="text-xs text-gold hover:underline"
                >
                  تعليم الكل كمقروء
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted">
                  لا توجد إشعارات بعد. ستظهر هنا بعد إتمام طلب.
                </p>
              ) : (
                items.map((n) => (
                  <Link
                    key={n.id}
                    href={n.href || (n.order_id ? `/orders/${n.order_id}` : "/")}
                    onClick={() => {
                      if (!n.is_read) void markRead(n.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "block border-b border-beige-dark/60 px-4 py-3 transition hover:bg-beige/40",
                      !n.is_read && "bg-gold/5"
                    )}
                  >
                    <p className="text-sm font-medium text-charcoal">
                      {n.title_ar}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      {n.body_ar}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
