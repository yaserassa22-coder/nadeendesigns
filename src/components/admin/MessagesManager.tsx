"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Mail, Phone, X } from "lucide-react";
import type { ContactMessage } from "@/types";
import type { ListVisibility } from "@/lib/admin/lifecycle-types";
import { filterLifecycleRows } from "@/lib/admin/query-lifecycle";
import { postLifecycle } from "@/lib/admin/lifecycle-client";
import { formatDate, formatDateTimeWestern } from "@/lib/utils";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { RowLifecycleActions } from "@/components/admin/lifecycle/RowLifecycleActions";
import { UndoSnackbar } from "@/components/admin/lifecycle/UndoSnackbar";
import { VisibilityFilter } from "@/components/admin/lifecycle/VisibilityFilter";
import type { LifecycleCapabilities } from "@/lib/admin/permissions";
import { notifyAdminInboxChanged } from "@/lib/admin/inbox-events";
import { cn } from "@/lib/utils";

interface MessagesManagerProps {
  initialMessages: ContactMessage[];
}

type ReplyTarget = {
  id: string;
  name: string;
  email: string;
  subject: string;
};

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function MessagesManager({ initialMessages }: MessagesManagerProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState<ListVisibility>("active");
  const [snack, setSnack] = useState<string | null>(null);
  const [lastDeletedId, setLastDeletedId] = useState<string | null>(null);
  const [caps, setCaps] = useState<LifecycleCapabilities | null>(null);

  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [replySuccess, setReplySuccess] = useState("");
  const [copyFlash, setCopyFlash] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetch("/api/admin/me", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (d?.capabilities) setCaps(d.capabilities);
        })
        .catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const markRead = async (id: string, is_read = true) => {
    const res = await fetch("/api/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_read }),
    });
    if (res.ok) {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_read } : m))
      );
      notifyAdminInboxChanged();
    }
  };

  const openMessage = (m: ContactMessage) => {
    if (!m.is_read) void markRead(m.id, true);
  };

  const openReply = (m: ContactMessage) => {
    setReplyTarget({
      id: m.id,
      name: m.name,
      email: m.email,
      subject: m.subject,
    });
    setReplySubject(
      m.subject.toLowerCase().startsWith("re:")
        ? m.subject
        : `Re: ${m.subject}`
    );
    setReplyBody("");
    setReplyError("");
    setReplySuccess("");
    if (!m.is_read) void markRead(m.id, true);
  };

  const closeReply = () => {
    if (replySending) return;
    setReplyTarget(null);
    setReplyError("");
    setReplySuccess("");
  };

  const sendReply = async () => {
    if (!replyTarget || replySending) return;
    setReplySending(true);
    setReplyError("");
    setReplySuccess("");
    try {
      const res = await fetch("/api/admin/messages/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: replyTarget.id,
          subject: replySubject,
          body: replyBody,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        detail?: string;
        last_reply_at?: string;
        last_reply_status?: string;
        last_reply_subject?: string;
      };
      if (!res.ok) {
        const msg = data.error || "تعذّر إرسال الرد";
        setReplyError(
          process.env.NODE_ENV !== "production" && data.detail
            ? `${msg} — ${data.detail}`
            : msg
        );
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === replyTarget.id
            ? {
                ...m,
                is_read: true,
                last_reply_at: data.last_reply_at ?? new Date().toISOString(),
                last_reply_status: data.last_reply_status ?? "sent",
                last_reply_subject:
                  data.last_reply_subject ?? replySubject,
                last_reply_error: null,
              }
            : m
        )
      );
      notifyAdminInboxChanged();
      setReplySuccess("✓ تم إرسال الرد بنجاح.");
      setSnack("تم إرسال الرد عبر البريد");
      window.setTimeout(() => {
        setReplyTarget(null);
        setReplySuccess("");
      }, 1200);
    } catch {
      setReplyError("تعذّر الاتصال بالخادم. تحققي من الشبكة.");
    } finally {
      setReplySending(false);
    }
  };

  const onCopy = async (label: string, value: string) => {
    const ok = await copyText(value);
    if (ok) {
      setCopyFlash(label);
      window.setTimeout(() => setCopyFlash(null), 1500);
    } else {
      setSnack("تعذّر النسخ");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const visible = filterLifecycleRows(
      messages as Array<
        ContactMessage & {
          is_deleted?: boolean | null;
          archived_at?: string | null;
        }
      >,
      visibility
    );
    if (!q) return visible;
    return visible.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q) ||
        (m.phone ?? "").toLowerCase().includes(q)
    );
  }, [messages, search, visibility]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">الرسائل</h1>
          <p className="mt-1 text-sm text-muted">
            رسائل نموذج التواصل — ردّي مباشرة عبر Resend
          </p>
        </div>
        {/* API download endpoint — not a Next.js page route */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/api/admin/export?module=messages"
          className="inline-flex items-center rounded-xl border border-beige-dark px-4 py-2 text-sm hover:bg-beige"
        >
          تصدير CSV
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="بحث"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="الاسم، البريد، الهاتف، الموضوع..."
        />
        <div>
          <p className="mb-1.5 text-sm text-muted">العرض</p>
          <VisibilityFilter value={visibility} onChange={setVisibility} />
        </div>
      </div>

      {copyFlash ? (
        <p className="text-xs text-emerald-700" role="status">
          <Check className="me-1 inline h-3.5 w-3.5" />
          تم نسخ {copyFlash}
        </p>
      ) : null}

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-beige-dark bg-white p-8 text-center text-muted">
            لا توجد رسائل
          </p>
        ) : (
          filtered.map((m) => (
            <article
              key={m.id}
              className="rounded-2xl border border-beige-dark bg-white p-5"
              onClick={() => openMessage(m)}
              onFocus={() => openMessage(m)}
              tabIndex={0}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <h3 className="font-semibold text-charcoal">{m.subject}</h3>
                  <p className="text-sm text-charcoal">
                    <span className="font-medium">{m.name}</span>
                  </p>
                  <p className="text-sm text-muted">
                    <span dir="ltr">{m.email}</span>
                    {m.phone ? (
                      <>
                        {" · "}
                        <span dir="ltr">{m.phone}</span>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs text-muted">
                    {formatDate(m.created_at)}
                  </p>
                  {!m.is_read ? (
                    <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs text-gold">
                      جديدة
                    </span>
                  ) : (
                    <span className="text-xs text-muted">مقروءة</span>
                  )}
                  {m.last_reply_status === "sent" ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                      تم الرد
                    </span>
                  ) : null}
                  {m.last_reply_status === "failed" ? (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">
                      فشل الرد
                    </span>
                  ) : null}
                  <RowLifecycleActions
                    module="messages"
                    id={m.id}
                    archived={Boolean(
                      (m as ContactMessage & { archived_at?: string | null })
                        .archived_at
                    )}
                    allowArchive={caps?.canArchive ?? true}
                    allowRestore={caps?.canRestore ?? true}
                    allowSoftDelete={caps?.canSoftDelete ?? true}
                    onChanged={(kind) => {
                      if (kind === "soft_delete") {
                        setLastDeletedId(m.id);
                        setMessages((prev) =>
                          prev.filter((x) => x.id !== m.id)
                        );
                        setSnack("تم نقل الرسالة إلى سلة المحذوفات");
                        notifyAdminInboxChanged();
                        return;
                      }
                      setMessages((prev) =>
                        prev.map((x) =>
                          x.id === m.id
                            ? ({
                                ...x,
                                archived_at:
                                  kind === "archive"
                                    ? new Date().toISOString()
                                    : null,
                              } as ContactMessage)
                            : x
                        )
                      );
                      notifyAdminInboxChanged();
                    }}
                    onError={(msg) => alert(msg)}
                  />
                </div>
              </div>

              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-charcoal">
                {m.message}
              </p>

              {m.last_reply_at ? (
                <p className="mt-2 text-xs text-muted">
                  آخر رد:{" "}
                  <span dir="ltr">
                    {formatDateTimeWestern(m.last_reply_at)}
                  </span>
                  {m.last_reply_subject
                    ? ` · ${m.last_reply_subject}`
                    : null}
                </p>
              ) : null}

              <div
                className="mt-4 flex flex-wrap gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  size="sm"
                  onClick={() => openReply(m)}
                  disabled={!m.email}
                >
                  <Mail className="h-3.5 w-3.5" />
                  رد
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void onCopy("البريد", m.email)}
                >
                  <Copy className="h-3.5 w-3.5" />
                  نسخ البريد
                </Button>
                {m.phone ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void onCopy("الهاتف", m.phone!)}
                  >
                    <Phone className="h-3.5 w-3.5" />
                    نسخ الهاتف
                  </Button>
                ) : null}
                {m.email ? (
                  <a
                    href={`mailto:${m.email}?subject=${encodeURIComponent(
                      m.subject.toLowerCase().startsWith("re:")
                        ? m.subject
                        : `Re: ${m.subject}`
                    )}`}
                    className="inline-flex items-center rounded-xl border border-beige-dark px-3 py-1.5 text-sm hover:bg-beige"
                  >
                    فتح mailto
                  </a>
                ) : null}
                {!m.is_read ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void markRead(m.id, true)}
                  >
                    تعليم كمقروءة
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void markRead(m.id, false)}
                  >
                    تعليم كغير مقروءة
                  </Button>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      {replyTarget ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-charcoal/45 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reply-modal-title"
        >
          <button
            type="button"
            aria-label="إغلاق"
            className="absolute inset-0"
            onClick={closeReply}
            disabled={replySending}
          />
          <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-beige-dark bg-white shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-beige-dark/70 px-5 py-4">
              <h2
                id="reply-modal-title"
                className="text-lg font-semibold text-charcoal"
              >
                رد على الرسالة
              </h2>
              <button
                type="button"
                onClick={closeReply}
                disabled={replySending}
                className="rounded-full p-2 text-muted hover:bg-beige disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-5 py-5">
              <div>
                <p className="mb-1.5 text-sm text-muted">إلى</p>
                <p
                  className="rounded-xl border border-beige-dark/60 bg-beige/30 px-3 py-2.5 text-sm text-charcoal"
                  dir="ltr"
                >
                  {replyTarget.name} &lt;{replyTarget.email}&gt;
                </p>
              </div>
              <Input
                label="الموضوع"
                value={replySubject}
                onChange={(e) => setReplySubject(e.target.value)}
                disabled={replySending}
              />
              <Textarea
                label="الرسالة"
                rows={8}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                disabled={replySending}
                placeholder="اكتبي ردّاً مهنياً للعميلة…"
              />
              {replyError ? (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                  {replyError}
                </p>
              ) : null}
              {replySuccess ? (
                <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                  {replySuccess}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-beige-dark/70 px-5 py-4">
              <Button
                variant="outline"
                onClick={closeReply}
                disabled={replySending}
              >
                إلغاء
              </Button>
              <Button
                loading={replySending}
                disabled={
                  replySending ||
                  !replySubject.trim() ||
                  replyBody.trim().length < 2
                }
                onClick={() => void sendReply()}
                className={cn(replySending && "pointer-events-none")}
              >
                إرسال
              </Button>
            </div>
          </div>
        </div>
      ) : null}

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
                  module: "messages",
                  id,
                });
                setSnack(null);
                const res = await fetch("/api/messages", {
                  cache: "no-store",
                });
                if (res.ok) {
                  const data = await res.json();
                  if (Array.isArray(data)) setMessages(data);
                }
              }
            : undefined
        }
      />
    </div>
  );
}
