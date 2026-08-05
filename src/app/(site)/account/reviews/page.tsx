"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

type Review = {
  id: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  created_at?: string;
};

export default function AccountReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/account/reviews");
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "تعذّر تحميل المراجعات");
        return;
      }
      setReviews(d.reviews ?? []);
    } catch {
      setError("تعذّر تحميل المراجعات. تحققي من الاتصال.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/account/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title, body, photo_urls: [] }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(d.error || "تعذّر إرسال المراجعة");
      }
      setTitle("");
      setBody("");
      setRating(5);
      setSuccess("تم إرسال مراجعتكِ بنجاح. شكراً لثقتكِ.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    setError("");
    try {
      const res = await fetch(`/api/account/reviews?id=${id}`, {
        method: "DELETE",
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(d.error || "تعذّر حذف المراجعة");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر حذف المراجعة");
    }
  }

  if (loading) return <div className="h-40 animate-pulse rounded-2xl bg-beige" />;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {reviews.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl border border-beige-dark bg-white px-5 py-4"
          >
            <p className="font-medium">
              {"★".repeat(r.rating)}
              {"☆".repeat(5 - r.rating)} {r.title}
            </p>
            <p className="mt-1 text-sm text-muted">{r.body}</p>
            <button
              type="button"
              className="mt-2 text-xs text-red-700/80"
              onClick={() => void remove(r.id)}
            >
              حذف
            </button>
          </div>
        ))}
        {!reviews.length && (
          <p className="text-sm text-muted">لا مراجعات بعد.</p>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-beige-dark bg-white p-5">
        <h3 className="font-medium">مراجعة جديدة</h3>
        <label className="block text-sm text-muted">
          التقييم
          <select
            className="mt-1 w-full rounded-xl border border-beige-dark px-3 py-2"
            value={rating}
            disabled={submitting}
            onChange={(e) => setRating(Number(e.target.value))}
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <input
          placeholder="عنوان"
          className="w-full rounded-xl border border-beige-dark px-3 py-2.5 text-sm"
          value={title}
          disabled={submitting}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="تفاصيل تجربتك"
          className="w-full rounded-xl border border-beige-dark px-3 py-2.5 text-sm"
          rows={3}
          value={body}
          disabled={submitting}
          onChange={(e) => setBody(e.target.value)}
        />
        <p className="text-xs text-muted">رفع الصور — جاهز لاحقاً عبر روابط.</p>
        {error ? (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>
        ) : null}
        {success ? (
          <p className="rounded-xl bg-gold/10 p-3 text-sm text-charcoal">
            {success}
          </p>
        ) : null}
        <Button
          style={{ backgroundColor: "#C9A14A" }}
          loading={submitting}
          disabled={submitting}
          onClick={() => void submit()}
        >
          إرسال للمراجعة
        </Button>
      </div>
    </div>
  );
}
