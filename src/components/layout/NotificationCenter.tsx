"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useCustomerAuth } from "@/components/auth/CustomerAuthProvider";
import { bookingNotificationKeys } from "@/lib/notifications/customer-keys";
import type { CustomerNotification } from "@/lib/notifications/customer-keys";
import { cn, formatDate } from "@/lib/utils";
import { useLocale } from "@/components/i18n/LocaleProvider";

const LAST_ORDER_KEY = "nadeen_last_order";
const LAST_BOOKING_KEY = "nadeen_last_booking";

function contactKey(
  phone?: string | null,
  email?: string | null
): string | undefined {
  const p = phone?.trim();
  if (p) return `p:${p}`;
  const e = email?.trim()?.toLowerCase();
  if (e) return `e:${e}`;
  return undefined;
}

function readStorageJson(key: string): string | null {
  try {
    return sessionStorage.getItem(key) || localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readLastOrderMeta(): {
  orderId?: string;
  phone?: string;
  email?: string;
  customerKey?: string;
} {
  try {
    const raw = readStorageJson(LAST_ORDER_KEY);
    if (!raw) return {};
    const order = JSON.parse(raw) as {
      id?: string;
      email?: string | null;
      phone?: string;
    };
    return {
      orderId: order.id,
      phone: order.phone || undefined,
      email: order.email || undefined,
      customerKey: contactKey(order.phone, order.email),
    };
  } catch {
    return {};
  }
}

function readLastBookingMeta(): {
  phone?: string;
  email?: string;
  customerKey?: string;
  bookingId?: string;
} {
  try {
    const raw = readStorageJson(LAST_BOOKING_KEY);
    if (!raw) return {};
    const booking = JSON.parse(raw) as {
      id?: string;
      phone?: string;
      email?: string | null;
      customerKey?: string;
    };
    return {
      bookingId: booking.id || undefined,
      phone: booking.phone || undefined,
      email: booking.email || undefined,
      customerKey:
        booking.customerKey || contactKey(booking.phone, booking.email),
    };
  } catch {
    return {};
  }
}

function normalizeAccountRows(
  raw: unknown[],
  fallbackTitle: string
): CustomerNotification[] {
  return raw.map((item) => {
    const n = item as Record<string, unknown>;
    return {
      id: String(n.id ?? crypto.randomUUID()),
      order_id: (n.order_id as string | null) ?? null,
      customer_key: (n.customer_key as string | null) ?? null,
      title_ar: String(n.title_ar ?? n.title ?? n.message ?? fallbackTitle),
      body_ar: String(n.body_ar ?? n.body ?? ""),
      order_status: (n.order_status as string | null) ?? null,
      href: (n.href as string | null) ?? null,
      is_read: Boolean(n.is_read ?? n.read_at),
      created_at: String(n.created_at ?? new Date().toISOString()),
    };
  });
}

function dedupeNotifications(
  list: CustomerNotification[]
): CustomerNotification[] {
  const seen = new Set<string>();
  const out: CustomerNotification[] = [];
  for (const n of list) {
    const sig = `${n.title_ar}|${n.order_status}|${n.href ?? ""}|${n.body_ar.slice(0, 80)}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(n);
  }
  return out;
}

export function NotificationCenter({ className }: { className?: string }) {
  const { t } = useLocale();
  const { customer, loading: authLoading } = useCustomerAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CustomerNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    const lists: CustomerNotification[][] = [];

    // Signed-in account inbox
    if (customer?.id) {
      try {
        const res = await fetch("/api/account/notifications", {
          credentials: "same-origin",
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok) {
          lists.push(
            normalizeAccountRows(
              data.notifications ?? [],
              t.notificationsUi.fallbackTitle
            )
          );
        }
      } catch {
        /* continue */
      }
    }

    // Also load by contact keys (covers guests + booking phone variants)
    const orderMeta = readLastOrderMeta();
    const bookingMeta = readLastBookingMeta();
    const keys = bookingNotificationKeys({
      phone: customer?.phone || bookingMeta.phone || orderMeta.phone,
      email: customer?.email || bookingMeta.email || orderMeta.email,
      customerKey:
        customer?.customer_key ||
        bookingMeta.customerKey ||
        orderMeta.customerKey,
    });
    if (bookingMeta.bookingId) {
      keys.push(`booking:${bookingMeta.bookingId}`);
    }

    if (keys.length || orderMeta.orderId) {
      const params = new URLSearchParams();
      if (orderMeta.orderId) params.set("orderId", orderMeta.orderId);
      if (keys.length) params.set("keys", keys.join(","));
      const phone = customer?.phone || bookingMeta.phone || orderMeta.phone;
      const email = customer?.email || bookingMeta.email || orderMeta.email;
      if (phone) params.set("phone", phone);
      if (email) params.set("email", email);
      try {
        const res = await fetch(`/api/notifications/customer?${params}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok) {
          lists.push(
            normalizeAccountRows(
              data.notifications ?? [],
              t.notificationsUi.fallbackTitle
            )
          );
        }
      } catch {
        /* ignore */
      }
    }

    const merged = dedupeNotifications(lists.flat()).sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setItems(merged);
    setUnread(merged.filter((n) => !n.is_read).length);
  }, [customer, t.notificationsUi.fallbackTitle]);

  useEffect(() => {
    if (authLoading) return;
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    const onStorage = () => void load();
    const onFocus = () => void load();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const intervalId = window.setInterval(() => void load(), 45_000);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.clearInterval(intervalId);
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

    await Promise.all(
      unreadIds.map((id) =>
        fetch("/api/notifications/customer", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        })
      )
    );
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
        aria-label={t.notificationsUi.aria}
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
            aria-label={t.common.close}
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-full end-0 z-50 mt-2 w-[min(92vw,22rem)] overflow-hidden rounded-2xl border border-beige-dark bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-beige-dark px-4 py-3">
              <p className="text-sm font-semibold text-charcoal">
                {t.notificationsUi.title}
              </p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => void markAll()}
                  className="text-xs text-gold hover:underline"
                >
                  {t.notificationsUi.markAllRead}
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted">
                  {t.notificationsUi.emptyHint}
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
                          : "/booking")
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
                  {t.notificationsUi.viewAll}
                </Link>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
