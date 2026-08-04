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

  async function load() {
    const d = await fetch("/api/account/reviews").then((r) => r.json());
    setReviews(d.reviews ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function submit() {
    await fetch("/api/account/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, title, body, photo_urls: [] }),
    });
    setTitle("");
    setBody("");
    void load();
  }

  async function remove(id: string) {
    await fetch(`/api/account/reviews?id=${id}`, { method: "DELETE" });
    void load();
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
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="تفاصيل تجربتك"
          className="w-full rounded-xl border border-beige-dark px-3 py-2.5 text-sm"
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <p className="text-xs text-muted">رفع الصور — جاهز لاحقاً عبر روابط.</p>
        <Button style={{ backgroundColor: "#C9A14A" }} onClick={() => void submit()}>
          إرسال للمراجعة
        </Button>
      </div>
    </div>
  );
}
