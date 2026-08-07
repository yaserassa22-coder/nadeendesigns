"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useCustomerAuth } from "@/components/auth/CustomerAuthProvider";
import { customerKeyFromContact } from "@/lib/customer-auth/otp";
import { cn, formatDate } from "@/lib/utils";
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
      customerKey:
        customerKeyFromContact(order.phone, order.email) ?? undefined,
    };
  } catch {
    return {};
  }
}

function normalizeAccountRows(raw: unknown[]): CustomerNotification[] {
  return raw.map((item) => {
    const n = item as Record<string, unknown>;
    return {
      id: String(n.id ?? crypto.randomUUID()),
      order_id: (n.order_id as string | null) ?? null,
      customer_key: (n.customer_key as string | null) ?? null,
      title_ar: String(n.title_ar ?? n.title ?? n.message ?? "إشعار"),
      body_ar: String(n.body_ar ?? n.body ?? ""),
      order_status: (n.order_status as string | null) ?? null,
      href: (n.href as string | null) ?? null,
      is_read: Boolean(n.is_read ?? n.read_at),
      created_at: String(n.created_at ?? new Date().toISOString()),
    };
  });
}

export function NotificationCenter({ className }: { className?: string }) {
  const { customer, loading: authLoading } = useCustomerAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CustomerNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    // Signed-in: Account inbox (same source as /account/notifications).
    if (customer?.id) {
      try {
        const res = await fetch("/api/account/notifications", {
          credentials: "same-origin",
        });
        const data = await res.json();
        if (!res.ok) return;
        const list = normalizeAccountRows(data.notifications ?? []);
        setItems(list);
        setUnread(list.filter((n) => !n.is_read).length);
        return;
      } catch {
        /* fall through to guest/order path */
      }
    }

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
  }, [customer?.id]);

  useEffect(() => {
    if (authLoading) return;
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    const onStorage = () => void load();
    window.addEventListener("storage", onStorage);
    const t = window.setInterval(() => void load(), 45_000);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(t);
    };
  }, [load, authLoading]);

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
    const unreadIds = items.filter((n) => !n.is_read).map((n) => n.id);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);

    if (customer?.id) {
      await Promise.all(
        unreadIds.map((id) =>
          fetch("/api/notifications/customer", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          })
        )
      );
      return;
    }

    const meta = readLastOrderMeta();
    if (!meta.orderId) return;
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
          <span className="absolute top-0 end-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] text-white">
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
                  {customer
                    ? "لا توجد إشعارات بعد."
                    : "لا توجد إشعارات بعد. ستظهر هنا بعد إتمام طلب."}
                </p>
              ) : (
                items.map((n) => (
                  <Link
                    key={n.id}
                    href={
                      n.href ||
                      (n.order_id
                        ? `/orders/${n.order_id}`
                        : customer
                          ? "/account/notifications"
                          : "/")
                    }
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
                    {n.created_at && (
                      <p className="mt-1 text-[11px] text-muted/80">
                        {formatDate(n.created_at)}
                      </p>
                    )}
                  </Link>
                ))
              )}
            </div>
            {customer ? (
              <div className="border-t border-beige-dark px-4 py-2 text-center">
                <Link
                  href="/account/notifications"
                  onClick={() => setOpen(false)}
                  className="text-xs text-gold hover:underline"
                >
                  عرض كل الإشعارات
                </Link>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
