"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { BOOKING_SERVICE_OPTIONS, type BookingSource, type Consultant } from "@/types";
import { ConfirmDialog } from "@/components/admin/lifecycle/ConfirmDialog";

type ManualBookingModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  canForceOverride?: boolean;
  defaultDate?: string;
  defaultTime?: string;
};

export function ManualBookingModal({
  open,
  onClose,
  onCreated,
  canForceOverride = false,
  defaultDate = "",
  defaultTime = "",
}: ManualBookingModalProps) {
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const [serviceType, setServiceType] = useState("consultation");
  const [source, setSource] = useState<BookingSource>("phone");
  const [consultantId, setConsultantId] = useState("");
  const [duration, setDuration] = useState(60);
  const [isVip, setIsVip] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forceConfirm, setForceConfirm] = useState(false);
  const [pendingForce, setPendingForce] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setDate(defaultDate);
      setTime(defaultTime.slice(0, 5));
      void fetch("/api/admin/appointments/consultants")
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d.consultants)) setConsultants(d.consultants);
        })
        .catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, defaultDate, defaultTime]);

  if (!open) return null;

  const submit = async (force: boolean) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email: email || null,
          date,
          time,
          service_type: serviceType,
          notes: notes || null,
          booking_source: source,
          consultant_id: consultantId || null,
          duration_minutes: duration,
          is_vip: isVip,
          notify_whatsapp: true,
          notify_email: Boolean(email),
          force,
        }),
      });
      const data = await res.json();
      if (res.status === 409 && canForceOverride && !force) {
        setPendingForce(true);
        setForceConfirm(true);
        setError(data.message || data.error);
        return;
      }
      if (!res.ok) {
        throw new Error(data.message || data.error || "فشل الحفظ");
      }
      onCreated();
      onClose();
      setName("");
      setPhone("");
      setEmail("");
      setNotes("");
      setIsVip(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4">
        <div
          className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-beige-dark bg-white p-6 shadow-xl"
          dir="rtl"
        >
          <h2 className="text-xl font-bold text-charcoal">إضافة حجز يدوي</h2>
          <p className="mt-1 text-sm text-muted">
            هاتف / حضور مباشر / إدارة — يحجز الموعد كالأونلاين
          </p>

          <div className="mt-5 space-y-4">
            <Input
              label="اسم العروس *"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="الهاتف *"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
            />
            <Input
              label="البريد (اختياري)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="التاريخ *"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <Input
                label="الوقت *"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <Select
              label="مصدر الحجز"
              value={source}
              onChange={(e) => setSource(e.target.value as BookingSource)}
              options={[
                { value: "phone", label: "هاتف" },
                { value: "walk_in", label: "حضور مباشر" },
                { value: "admin", label: "يدوي (إدارة)" },
              ]}
            />
            <Select
              label="المستشارة"
              value={consultantId}
              onChange={(e) => setConsultantId(e.target.value)}
              options={[
                { value: "", label: "بدون تعيين" },
                ...consultants
                  .filter((c) => c.active)
                  .map((c) => ({ value: c.id, label: c.name_ar })),
              ]}
            />
            <Select
              label="الخدمة"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              options={[
                ...BOOKING_SERVICE_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                })),
                { value: "consultation", label: "استشارة (60 د)" },
                { value: "fitting", label: "قياس (45 د)" },
              ]}
            />
            <Select
              label="المدة (دقائق)"
              value={String(duration)}
              onChange={(e) => setDuration(Number(e.target.value))}
              options={[
                { value: "45", label: "45" },
                { value: "60", label: "60" },
                { value: "90", label: "90" },
              ]}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isVip}
                onChange={(e) => setIsVip(e.target.checked)}
              />
              عميلة VIP
            </label>
            <Textarea
              label="ملاحظات"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
            {error && (
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                {error}
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              إلغاء
            </Button>
            <Button
              loading={loading}
              onClick={() => void submit(false)}
              disabled={!name.trim() || !phone.trim() || !date || !time}
            >
              حفظ الحجز
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={forceConfirm}
        title="تجاوز التعارض؟"
        description="هذا الموعد متعارض مع حجز آخر. التجاوز متاح للمالك فقط ويُسجَّل في سجل النشاط."
        confirmLabel="تجاوز وحفظ"
        onCancel={() => {
          setForceConfirm(false);
          setPendingForce(false);
        }}
        onConfirm={() => {
          setForceConfirm(false);
          if (pendingForce) void submit(true);
        }}
      />
    </>
  );
}
