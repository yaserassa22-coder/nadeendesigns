"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import type { Booking, BookingStatus } from "@/types";
import { BOOKING_STATUS_LABELS, SERVICE_TYPE_LABELS } from "@/types";
import { formatDate } from "@/lib/utils";
import { Select } from "@/components/ui/Input";

interface BookingsManagerProps {
  initialBookings: Booking[];
}

const STATUS_OPTIONS = Object.entries(BOOKING_STATUS_LABELS).map(
  ([value, label]) => ({ value, label })
);

export function BookingsManager({ initialBookings }: BookingsManagerProps) {
  const [bookings, setBookings] = useState(initialBookings);
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const [updating, setUpdating] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      filter === "all"
        ? bookings
        : bookings.filter((b) => b.status === filter),
    [bookings, filter]
  );

  const updateStatus = async (id: string, status: BookingStatus) => {
    setUpdating(id);
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "فشل التحديث");
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status } : b))
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setUpdating(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذا الحجز؟")) return;
    const res = await fetch(`/api/bookings?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "فشل الحذف");
      return;
    }
    setBookings((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="max-w-xs">
        <Select
          label="تصفية حسب الحالة"
          value={filter}
          onChange={(e) => setFilter(e.target.value as BookingStatus | "all")}
          options={[{ value: "all", label: "الكل" }, ...STATUS_OPTIONS]}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-beige-dark bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-beige/50 text-muted">
              <tr>
                <th className="px-4 py-3 text-right font-medium">العميلة</th>
                <th className="px-4 py-3 text-right font-medium">الموعد</th>
                <th className="px-4 py-3 text-right font-medium">الخدمة</th>
                <th className="px-4 py-3 text-right font-medium">الحالة</th>
                <th className="px-4 py-3 text-right font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">
                    لا توجد حجوزات
                  </td>
                </tr>
              ) : (
                filtered.map((booking) => (
                  <tr key={booking.id} className="border-t border-beige-dark">
                    <td className="px-4 py-3">
                      <p className="font-medium text-charcoal">{booking.name}</p>
                      <p className="text-xs text-muted" dir="ltr">
                        {booking.phone}
                      </p>
                      {booking.email && (
                        <p className="text-xs text-muted" dir="ltr">
                          {booking.email}
                        </p>
                      )}
                      {booking.notes && (
                        <p className="mt-1 max-w-xs text-xs text-muted">
                          {booking.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p>{formatDate(booking.date)}</p>
                      <p className="text-xs text-muted" dir="ltr">
                        {booking.time}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {SERVICE_TYPE_LABELS[booking.service_type]}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={booking.status}
                        disabled={updating === booking.id}
                        onChange={(e) =>
                          updateStatus(
                            booking.id,
                            e.target.value as BookingStatus
                          )
                        }
                        className="rounded-lg border border-beige-dark bg-white px-3 py-2 text-sm"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => remove(booking.id)}
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                        aria-label="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
