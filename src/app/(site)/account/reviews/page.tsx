"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n";

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
  const { t, locale } = useLocale();
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
        setError(d.error || t.account.reviewLoadFailed);
        return;
      }
      setReviews(d.reviews ?? []);
    } catch {
      setError(t.account.reviewLoadFailed);
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
        throw new Error(d.error || t.account.reviewSubmitFailed);
      }
      setTitle("");
      setBody("");
      setRating(5);
      setSuccess(t.account.reviewSuccess);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.errorGeneric);
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
        throw new Error(d.error || t.account.reviewDeleteFailed);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.account.reviewDeleteFailed);
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
            >{t.common.delete}</button>
          </div>
        ))}
        {!reviews.length && (
          <p className="text-sm text-muted">{t.account.noReviews}</p>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-beige-dark bg-white p-5">
        <h3 className="font-medium">{t.account.newReview}</h3>
        <label className="block text-sm text-muted">
          {t.account.rating}
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
          placeholder={t.account.reviewTitlePlaceholder}
          className="w-full rounded-xl border border-beige-dark px-3 py-2.5 text-sm"
          value={title}
          disabled={submitting}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder={t.account.reviewBodyPlaceholder}
          className="w-full rounded-xl border border-beige-dark px-3 py-2.5 text-sm"
          rows={3}
          value={body}
          disabled={submitting}
          onChange={(e) => setBody(e.target.value)}
        />
        <p className="text-xs text-muted">{t.account.reviewPhotosHint}</p>
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
          {t.account.submitReview}
        </Button>
      </div>
    </div>
  );
}
