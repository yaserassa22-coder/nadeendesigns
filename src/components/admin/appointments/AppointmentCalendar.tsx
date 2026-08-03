"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BOOKING_SOURCE_LABELS,
  BOOKING_STATUS_LABELS,
  type AppointmentLifecycleAction,
  type Booking,
  type BookingSource,
  type Consultant,
} from "@/types";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { ManualBookingModal } from "@/components/admin/appointments/ManualBookingModal";
import { ConfirmDialog } from "@/components/admin/lifecycle/ConfirmDialog";
import { cn } from "@/lib/utils";

type ViewMode = "day" | "week" | "month";

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  x.setHours(12, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function sourceColor(b: Booking): string {
  if (b.status === "cancelled" || b.no_show_at) return "bg-red-100 border-red-300 text-red-800";
  if (b.status === "completed") return "bg-stone-100 border-stone-300 text-stone-700";
  if (b.is_vip) return "bg-amber-100 border-amber-400 text-amber-900";
  const src = (b.booking_source || "online") as BookingSource;
  if (src === "phone") return "bg-sky-100 border-sky-300 text-sky-900";
  if (src === "walk_in") return "bg-orange-100 border-orange-300 text-orange-900";
  return "bg-emerald-100 border-emerald-300 text-emerald-900";
}

function timeLabel(t: string) {
  return (t || "").slice(0, 5);
}

export function AppointmentCalendar({
  canForceOverride = false,
}: {
  canForceOverride?: boolean;
}) {
  const [view, setView] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualDefaults, setManualDefaults] = useState({ date: "", time: "" });
  const [selected, setSelected] = useState<Booking | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editDuration, setEditDuration] = useState(60);
  const [editConsultant, setEditConsultant] = useState("");
  const [saving, setSaving] = useState(false);
  const [forceConfirm, setForceConfirm] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, cRes] = await Promise.all([
        fetch("/api/bookings", { cache: "no-store" }),
        fetch("/api/admin/appointments/consultants", { cache: "no-store" }),
      ]);
      const bData = await bRes.json();
      const cData = await cRes.json();
      if (!bRes.ok) throw new Error(bData.error || "فشل جلب الحجوزات");
      setBookings(Array.isArray(bData) ? bData : []);
      setConsultants(Array.isArray(cData.consultants) ? cData.consultants : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const consultantName = useCallback(
    (id?: string | null) =>
      consultants.find((c) => c.id === id)?.name_ar || "—",
    [consultants]
  );

  const days = useMemo(() => {
    if (view === "day") return [new Date(anchor)];
    if (view === "week") {
      const start = startOfWeek(anchor);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    const first = new Date(y, m, 1, 12);
    const start = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [view, anchor]);

  const byDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      if (b.is_deleted) continue;
      const key = b.date;
      const list = map.get(key) ?? [];
      list.push(b);
      map.set(key, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => timeLabel(a.time).localeCompare(timeLabel(b.time)));
    }
    return map;
  }, [bookings]);

  const openEdit = (b: Booking) => {
    setSelected(b);
    setEditDate(b.date);
    setEditTime(timeLabel(b.time));
    setEditDuration(b.duration_minutes || 60);
    setEditConsultant(b.consultant_id || "");
  };

  const patchBooking = async (
    id: string,
    payload: Record<string, unknown>,
    force = false
  ) => {
    setSaving(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...payload, force }),
      });
      const data = await res.json();
      if (res.status === 409 && canForceOverride && !force) {
        setForceConfirm(true);
        throw new Error(data.message || "تعارض");
      }
      if (!res.ok) throw new Error(data.message || data.error || "فشل التحديث");
      await load();
      setSelected(null);
      setForceConfirm(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setSaving(false);
    }
  };

  const lifecycle = (action: AppointmentLifecycleAction) => {
    if (!selected) return;
    void patchBooking(selected.id, { lifecycle_action: action });
  };

  const moveToDay = async (bookingId: string, date: string) => {
    const b = bookings.find((x) => x.id === bookingId);
    if (!b) return;
    await patchBooking(bookingId, { date, time: b.time });
  };

  const title =
    view === "day"
      ? anchor.toLocaleDateString("ar")
      : view === "week"
        ? `أسبوع ${dayKey(startOfWeek(anchor))}`
        : anchor.toLocaleDateString("ar", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div className="flex flex-wrap gap-2">
          {(["day", "week", "month"] as ViewMode[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "rounded-xl px-4 py-2 text-sm",
                view === v
                  ? "bg-gold text-white"
                  : "border border-beige-dark hover:bg-beige"
              )}
            >
              {v === "day" ? "يوم" : v === "week" ? "أسبوع" : "شهر"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() =>
              setAnchor(
                addDays(
                  anchor,
                  view === "day" ? -1 : view === "week" ? -7 : -30
                )
              )
            }
          >
            السابق
          </Button>
          <Button variant="outline" onClick={() => setAnchor(new Date())}>
            اليوم
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              setAnchor(
                addDays(
                  anchor,
                  view === "day" ? 1 : view === "week" ? 7 : 30
                )
              )
            }
          >
            التالي
          </Button>
          <span className="px-2 text-sm font-medium text-charcoal">{title}</span>
          <Button
            onClick={() => {
              setManualDefaults({ date: dayKey(anchor), time: "10:00" });
              setManualOpen(true);
            }}
          >
            إضافة حجز يدوي
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            طباعة الجدول
          </Button>
          <Button variant="outline" loading={loading} onClick={() => void load()}>
            تحديث
          </Button>
        </div>
      </div>

      <div className="print:block hidden print:mb-4">
        <h1 className="text-2xl font-bold">جدول مواعيد NadEEN Designs</h1>
        <p>{title}</p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600 print:hidden">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-muted print:hidden">
        <span className="rounded-lg bg-emerald-100 px-2 py-1">أونلاين</span>
        <span className="rounded-lg bg-sky-100 px-2 py-1">هاتف</span>
        <span className="rounded-lg bg-orange-100 px-2 py-1">حضور</span>
        <span className="rounded-lg bg-amber-100 px-2 py-1">VIP</span>
        <span className="rounded-lg bg-stone-100 px-2 py-1">مكتمل</span>
        <span className="rounded-lg bg-red-100 px-2 py-1">ملغي</span>
      </div>

      <div
        className={cn(
          "grid gap-2",
          view === "day" && "grid-cols-1",
          view === "week" && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-7",
          view === "month" && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-7"
        )}
      >
        {days.map((d) => {
          const key = dayKey(d);
          const list = byDate.get(key) ?? [];
          const inMonth =
            view !== "month" || d.getMonth() === anchor.getMonth();
          return (
            <div
              key={key}
              className={cn(
                "min-h-[120px] rounded-2xl border border-beige-dark bg-white p-2",
                !inMonth && "opacity-40",
                key === dayKey(new Date()) && "ring-1 ring-gold/50"
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) void moveToDay(dragId, key);
                setDragId(null);
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-charcoal">
                  {d.toLocaleDateString("ar", {
                    weekday: "short",
                    day: "numeric",
                    month: view === "month" ? "short" : undefined,
                  })}
                </p>
                <button
                  type="button"
                  className="text-xs text-gold print:hidden"
                  onClick={() => {
                    setManualDefaults({ date: key, time: "10:00" });
                    setManualOpen(true);
                  }}
                >
                  +
                </button>
              </div>
              <div className="space-y-1.5">
                {list.length === 0 ? (
                  <p className="text-xs text-muted">لا مواعيد</p>
                ) : (
                  list.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      draggable
                      onDragStart={() => setDragId(b.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => openEdit(b)}
                      className={cn(
                        "w-full rounded-lg border px-2 py-1.5 text-right text-xs transition hover:opacity-90",
                        sourceColor(b)
                      )}
                    >
                      <p className="font-semibold">
                        {timeLabel(b.time)} · {b.name}
                        {b.is_vip ? " ★" : ""}
                      </p>
                      <p className="opacity-80" dir="ltr">
                        {b.phone}
                      </p>
                      <p className="opacity-70">
                        {BOOKING_STATUS_LABELS[b.status]} ·{" "}
                        {consultantName(b.consultant_id)} ·{" "}
                        {BOOKING_SOURCE_LABELS[
                          (b.booking_source || "online") as BookingSource
                        ]}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4 print:hidden">
          <div className="w-full max-w-md rounded-2xl border border-beige-dark bg-white p-6">
            <h3 className="text-lg font-bold">{selected.name}</h3>
            <p className="text-sm text-muted" dir="ltr">
              {selected.phone}
            </p>
            <div className="mt-4 space-y-3">
              <Input
                label="التاريخ"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
              <Input
                label="الوقت"
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
              />
              <Select
                label="المدة"
                value={String(editDuration)}
                onChange={(e) => setEditDuration(Number(e.target.value))}
                options={[
                  { value: "45", label: "45 دقيقة" },
                  { value: "60", label: "60 دقيقة" },
                  { value: "90", label: "90 دقيقة" },
                ]}
              />
              <Select
                label="المستشارة"
                value={editConsultant}
                onChange={(e) => setEditConsultant(e.target.value)}
                options={[
                  { value: "", label: "بدون تعيين" },
                  ...consultants.map((c) => ({
                    value: c.id,
                    label: c.name_ar,
                  })),
                ]}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => lifecycle("arrived")}
              >
                وصلت العميلة
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => lifecycle("started")}
              >
                بدأ الموعد
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => lifecycle("completed")}
              >
                انتهى الموعد
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => lifecycle("no_show")}
              >
                لم تحضر
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>
                إغلاق
              </Button>
              <Button
                loading={saving}
                onClick={() =>
                  void patchBooking(selected.id, {
                    date: editDate,
                    time: editTime,
                    duration_minutes: editDuration,
                    consultant_id: editConsultant || null,
                  })
                }
              >
                حفظ التعديل
              </Button>
            </div>
          </div>
        </div>
      )}

      <ManualBookingModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onCreated={() => void load()}
        canForceOverride={canForceOverride}
        defaultDate={manualDefaults.date}
        defaultTime={manualDefaults.time}
      />

      <ConfirmDialog
        open={forceConfirm}
        title="تجاوز التعارض؟"
        description="الموعد متعارض. التجاوز للمالك فقط ويُسجَّل في سجل النشاط."
        confirmLabel="تجاوز وحفظ"
        onCancel={() => setForceConfirm(false)}
        onConfirm={() => {
          if (!selected) return;
          void patchBooking(
            selected.id,
            {
              date: editDate,
              time: editTime,
              duration_minutes: editDuration,
              consultant_id: editConsultant || null,
            },
            true
          );
        }}
      />

    </div>
  );
}
