"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, RefreshCw, Sparkles } from "lucide-react";
import type { Booking, BookingStatus, DeliveryStatus } from "@/types";
import {
  BOOKING_STATUS_LABELS,
  DELIVERY_STATUS_LABELS,
  getServiceTypeLabel,
} from "@/types";
import type { ListVisibility } from "@/lib/admin/lifecycle-types";
import { filterLifecycleRows } from "@/lib/admin/query-lifecycle";
import { formatDate } from "@/lib/utils";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PersonalizationSummary } from "@/components/dresses/PersonalizationSummary";
import { GiftOptionsSummary } from "@/components/dresses/GiftOptionsSummary";
import { RowLifecycleActions } from "@/components/admin/lifecycle/RowLifecycleActions";
import { UndoSnackbar } from "@/components/admin/lifecycle/UndoSnackbar";
import { VisibilityFilter } from "@/components/admin/lifecycle/VisibilityFilter";
import { postLifecycle } from "@/lib/admin/lifecycle-client";

interface BookingsManagerProps {
  initialBookings: Booking[];
  initialError?: string | null;
}

const STATUS_OPTIONS = Object.entries(BOOKING_STATUS_LABELS).map(
  ([value, label]) => ({ value, label })
);

const DELIVERY_OPTIONS = Object.entries(DELIVERY_STATUS_LABELS).map(
  ([value, label]) => ({ value, label })
);

function normalizeBooking(b: Booking): Booking {
  return {
    ...b,
    delivery_required: Boolean(b.delivery_required),
    status: b.status || "pending",
  };
}

export function BookingsManager({
  initialBookings,
  initialError = null,
}: BookingsManagerProps) {
  const [bookings, setBookings] = useState(() =>
    initialBookings.map(normalizeBooking)
  );
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const [visibility, setVisibility] = useState<ListVisibility>("active");
  const [updating, setUpdating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [snack, setSnack] = useState<string | null>(null);
  const [lastDeletedId, setLastDeletedId] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || data.message || `فشل جلب الحجوزات (${res.status})`
        );
      }
      if (!Array.isArray(data)) {
        throw new Error("استجابة غير صالحة من واجهة الحجوزات");
      }
      setBookings(data.map((b: Booking) => normalizeBooking(b)));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل جلب الحجوزات");
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh from API with the admin session after mount
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBookings();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadBookings]);

  const filtered = useMemo(() => {
    const byVis = filterLifecycleRows(
      bookings as Array<
        Booking & { is_deleted?: boolean | null; archived_at?: string | null }
      >,
      visibility
    );
    if (filter === "all") return byVis;
    return byVis.filter((b) => b.status === filter);
  }, [bookings, filter, visibility]);

  const patchBooking = async (
    id: string,
    payload: { status?: BookingStatus; delivery_status?: DeliveryStatus }
  ) => {
    setUpdating(id);
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "فشل التحديث");
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...payload } : b))
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <Select
            label="تصفية حسب الحالة"
            value={filter}
            onChange={(e) => setFilter(e.target.value as BookingStatus | "all")}
            options={[{ value: "all", label: "الكل" }, ...STATUS_OPTIONS]}
          />
          <div>
            <p className="mb-1.5 text-sm text-muted">العرض</p>
            <VisibilityFilter value={visibility} onChange={setVisibility} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/admin/export?module=bookings"
            className="inline-flex items-center rounded-xl border border-beige-dark px-4 py-2 text-sm hover:bg-beige"
          >
            تصدير CSV
          </a>
          <Button
            variant="outline"
            loading={loading}
            onClick={() => void loadBookings()}
          >
            <RefreshCw className="h-4 w-4" />
            تحديث القائمة
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <p className="font-medium">خطأ في جلب الحجوزات من Supabase</p>
          <p className="mt-1 whitespace-pre-wrap" dir="ltr">
            {error}
          </p>
          <p className="mt-2 text-red-600/80">
            تأكدي أن حسابكِ admin في جدول profiles، وأن سياسة RLS تسمح بالقراءة،
            أو أني SUPABASE_SERVICE_ROLE_KEY مضبوطة في البيئة.
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-beige-dark bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-beige/50 text-muted">
              <tr>
                <th className="px-4 py-3 text-right font-medium">العميلة</th>
                <th className="px-4 py-3 text-right font-medium">الموعد</th>
                <th className="px-4 py-3 text-right font-medium">الخدمة</th>
                <th className="px-4 py-3 text-right font-medium">التوصيل</th>
                <th className="px-4 py-3 text-right font-medium">الحالة</th>
                <th className="px-4 py-3 text-right font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {!error && filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    {loading ? "جاري التحميل..." : "لا توجد حجوزات"}
                  </td>
                </tr>
              ) : (
                filtered.map((booking) => {
                  const isOpen = expanded === booking.id;
                  const hasDetails =
                    booking.delivery_required ||
                    Boolean(booking.personalization) ||
                    Boolean(booking.gift_options?.enabled) ||
                    Boolean(booking.notes);
                  return (
                    <Fragment key={booking.id}>
                      <tr className="border-t border-beige-dark">
                        <td className="px-4 py-3">
                          <p className="font-medium text-charcoal">
                            {booking.name}
                          </p>
                          <p className="text-xs text-muted" dir="ltr">
                            {booking.phone}
                          </p>
                          {booking.email && (
                            <p className="text-xs text-muted">{booking.email}</p>
                          )}
                          {booking.personalization && (
                            <p className="mt-1 inline-flex items-center gap-1 text-xs text-gold">
                              <Sparkles className="h-3 w-3" />
                              تخصيص كتابة
                            </p>
                          )}
                          {booking.gift_options?.enabled && (
                            <p className="mt-1 text-xs text-gold">🎁 تغليف هدية</p>
                          )}
                          {booking.notes && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted">
                              {booking.notes}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p>{formatDate(booking.date)}</p>
                          <p className="text-xs text-muted" dir="ltr">
                            {booking.time}
                          </p>
                          {booking.created_at && (
                            <p className="text-xs text-muted">
                              أُنشئ: {formatDate(booking.created_at)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {getServiceTypeLabel(booking.service_type)}
                        </td>
                        <td className="px-4 py-3">
                          {booking.delivery_required ? "نعم" : "لا"}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={booking.status}
                            disabled={updating === booking.id}
                            onChange={(e) =>
                              patchBooking(booking.id, {
                                status: e.target.value as BookingStatus,
                              })
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
                          <div className="flex items-center gap-2">
                            {hasDetails && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpanded(isOpen ? null : booking.id)
                                }
                                className="inline-flex items-center gap-1 text-gold"
                              >
                                تفاصيل
                                {isOpen ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>
                            )}
                            <RowLifecycleActions
                              module="bookings"
                              id={booking.id}
                              archived={Boolean(
                                (booking as Booking & { archived_at?: string | null })
                                  .archived_at
                              )}
                              onChanged={(kind) => {
                                if (kind === "soft_delete") {
                                  setLastDeletedId(booking.id);
                                  setBookings((prev) =>
                                    prev.filter((b) => b.id !== booking.id)
                                  );
                                  setSnack("تم نقل الحجز إلى سلة المحذوفات");
                                  return;
                                }
                                setBookings((prev) =>
                                  prev.map((b) =>
                                    b.id === booking.id
                                      ? {
                                          ...b,
                                          archived_at:
                                            kind === "archive"
                                              ? new Date().toISOString()
                                              : null,
                                        }
                                      : b
                                  )
                                );
                                setSnack(
                                  kind === "archive"
                                    ? "تمت الأرشفة"
                                    : "تم إلغاء الأرشفة"
                                );
                              }}
                              onError={(msg) => alert(msg)}
                            />
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-t border-beige-dark/60 bg-beige/30">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="space-y-6">
                              {booking.personalization && (
                                <PersonalizationSummary
                                  personalization={booking.personalization}
                                  title="تفاصيل التخصيص / الطلب"
                                  compact
                                />
                              )}
                              {booking.gift_options?.enabled && (
                                <GiftOptionsSummary
                                  giftOptions={booking.gift_options}
                                  title="تفاصيل التغليف والإهداء"
                                />
                              )}
                              {(booking.city ||
                                booking.region ||
                                booking.delivery_required) && (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                  {booking.city && (
                                    <div>
                                      <p className="text-xs text-muted">
                                        المدينة
                                      </p>
                                      <p className="font-medium">
                                        {booking.city}
                                      </p>
                                    </div>
                                  )}
                                  {booking.delivery_required && (
                                    <>
                                      <div>
                                        <p className="text-xs text-muted">
                                          المنطقة
                                        </p>
                                        <p className="font-medium">
                                          {booking.region ||
                                            booking.delivery_region ||
                                            "—"}
                                        </p>
                                      </div>
                                      <div className="md:col-span-2">
                                        <p className="text-xs text-muted">
                                          عنوان التوصيل
                                        </p>
                                        <p className="font-medium">
                                          {booking.delivery_address || "—"}
                                        </p>
                                      </div>
                                      {booking.delivery_status !== undefined && (
                                        <div>
                                          <p className="mb-1 text-xs text-muted">
                                            حالة التوصيل
                                          </p>
                                          <select
                                            value={
                                              booking.delivery_status ??
                                              "pending"
                                            }
                                            disabled={updating === booking.id}
                                            onChange={(e) =>
                                              patchBooking(booking.id, {
                                                delivery_status: e.target
                                                  .value as DeliveryStatus,
                                              })
                                            }
                                            className="w-full rounded-lg border border-beige-dark bg-white px-3 py-2 text-sm"
                                          >
                                            {DELIVERY_OPTIONS.map((opt) => (
                                              <option
                                                key={opt.value}
                                                value={opt.value}
                                              >
                                                {opt.label}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                              {booking.notes && (
                                <div>
                                  <p className="text-xs text-muted">ملاحظات</p>
                                  <p className="mt-1 whitespace-pre-wrap">
                                    {booking.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UndoSnackbar
        message={snack}
        onDismiss={() => {
          setSnack(null);
          setLastDeletedId(null);
        }}
        onUndo={
          lastDeletedId
            ? async () => {
                const id = lastDeletedId;
                setLastDeletedId(null);
                await postLifecycle({
                  action: "restore",
                  module: "bookings",
                  id,
                });
                setSnack(null);
                await loadBookings();
              }
            : undefined
        }
      />
    </div>
  );
}
