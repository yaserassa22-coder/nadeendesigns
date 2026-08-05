"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import type { PurchaseFlow, PurchaseFlowCtaKind } from "@/lib/products/purchase-flows";
import { PRODUCT_COMMERCE_TYPE_LABELS } from "@/lib/products/primary-action";

const CTA_OPTIONS: { value: PurchaseFlowCtaKind; label: string }[] = [
  { value: "add_to_cart", label: "أضف إلى السلة" },
  { value: "book_appointment", label: "احجزي موعد" },
  { value: "request_design", label: "اطلبي تصميم" },
  { value: "book_now", label: "احجز الآن" },
];

export function PurchaseFlowsManager() {
  const [flows, setFlows] = useState<PurchaseFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/purchase-flows", { cache: "no-store" });
      const data = (await res.json()) as { flows?: PurchaseFlow[] };
      if (!res.ok) throw new Error("fail");
      setFlows(data.flows ?? []);
    } catch {
      setError("تعذّر تحميل مسارات الشراء");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const update = (idx: number, patch: Partial<PurchaseFlow>) => {
    setFlows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const saveOne = async (flow: PurchaseFlow) => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/purchase-flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(flow),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "فشل الحفظ");
      }
      setMessage("تم حفظ المسار");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted">جاري التحميل…</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        كل نوع منتج له مسار شراء يحدد الزر الأساسي والأزرار الثانوية. الواجهة
        تقرأ هذا المسار — ليس اسم التصنيف.
      </p>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      {flows.map((flow, idx) => {
        const typeLabel =
          PRODUCT_COMMERCE_TYPE_LABELS[
            flow.product_type as keyof typeof PRODUCT_COMMERCE_TYPE_LABELS
          ] ?? flow.product_type;

        return (
          <div
            key={flow.id}
            className="rounded-2xl border border-beige-dark bg-white p-5"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-charcoal">
                  {flow.name_ar || flow.name}
                </h3>
                <p className="text-xs text-muted">
                  نوع المنتج: {typeLabel}{" "}
                  <span dir="ltr">({flow.product_type})</span>
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => void saveOne(flow)}
                disabled={saving}
              >
                حفظ المسار
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="الاسم (عربي)"
                value={flow.name_ar}
                onChange={(e) => update(idx, { name_ar: e.target.value })}
              />
              <Select
                label="الزر الأساسي"
                value={flow.primary_cta}
                onChange={(e) =>
                  update(idx, {
                    primary_cta: e.target.value as PurchaseFlowCtaKind,
                  })
                }
                options={CTA_OPTIONS}
              />
              <Input
                label="نص الزر الأساسي"
                value={flow.primary_label_ar}
                onChange={(e) =>
                  update(idx, { primary_label_ar: e.target.value })
                }
              />
              <Input
                label="الأزرار الثانوية (افصلي بفاصلة)"
                value={flow.secondary_ctas.join(", ")}
                onChange={(e) =>
                  update(idx, {
                    secondary_ctas: e.target.value
                      .split(/[,،]/)
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                dir="ltr"
                placeholder="buy_now, wishlist"
              />
              <div className="sm:col-span-2">
                <Textarea
                  label="الوصف"
                  value={flow.description_ar}
                  onChange={(e) =>
                    update(idx, { description_ar: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-gold"
                  checked={flow.hide_cart}
                  onChange={(e) =>
                    update(idx, { hide_cart: e.target.checked })
                  }
                />
                إخفاء السلة
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-gold"
                  checked={flow.hide_buy_now}
                  onChange={(e) =>
                    update(idx, { hide_buy_now: e.target.checked })
                  }
                />
                إخفاء شراء الآن
              </label>
              <div className="sm:col-span-2">
                <Input
                  label="الخطوات (ترتيب)"
                  value={flow.steps.join(" → ")}
                  onChange={(e) =>
                    update(idx, {
                      steps: e.target.value
                        .split(/→|,|،/)
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  dir="ltr"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
