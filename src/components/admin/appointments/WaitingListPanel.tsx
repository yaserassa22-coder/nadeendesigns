"use client";

import { useCallback, useEffect, useState } from "react";
import type { WaitingListEntry } from "@/types";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";

export function WaitingListPanel() {
  const [entries, setEntries] = useState<WaitingListEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/appointments/waiting-list", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل التحميل");
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      setWarning(data.warning || null);
    } catch {
      setEntries([]);
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

  const setStatus = async (id: string, status: string) => {
    const res = await fetch("/api/admin/appointments/waiting-list", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) void load();
  };

  return (
    <section className="space-y-3 rounded-2xl border border-beige-dark bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">قائمة الانتظار</h2>
          <p className="text-sm text-muted">عند إلغاء موعد يُبلَّغ أول منتظرة (إن توفّر Twilio/Resend)</p>
        </div>
        <Button variant="outline" loading={loading} onClick={() => void load()}>
          تحديث
        </Button>
      </div>
      {warning && (
        <p className="text-sm text-amber-800">{warning}</p>
      )}
      {entries.length === 0 ? (
        <p className="text-sm text-muted">لا أحد في الانتظار</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-muted">
              <tr>
                <th className="px-2 py-2 text-right">الاسم</th>
                <th className="px-2 py-2 text-right">الهاتف</th>
                <th className="px-2 py-2 text-right">التاريخ المفضّل</th>
                <th className="px-2 py-2 text-right">الحالة</th>
                <th className="px-2 py-2 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-beige-dark">
                  <td className="px-2 py-2">{e.name}</td>
                  <td className="px-2 py-2" dir="ltr">
                    {e.phone}
                  </td>
                  <td className="px-2 py-2">
                    {e.preferred_date ? formatDate(e.preferred_date) : "—"}
                  </td>
                  <td className="px-2 py-2">{e.status}</td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-1">
                      {e.status === "waiting" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void setStatus(e.id, "notified")}
                        >
                          تم الإبلاغ
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void setStatus(e.id, "booked")}
                      >
                        حُجز
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void setStatus(e.id, "cancelled")}
                      >
                        إلغاء
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
