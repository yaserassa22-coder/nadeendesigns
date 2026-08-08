"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

type Msg = {
  id: string;
  sender: string;
  body: string;
  created_at?: string;
};

export default function AccountMessagesPage() {
  const { t, locale } = useLocale();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [stub, setStub] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/account/messages");
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || t.account.messagesLoadFailed);
        return;
      }
      setMessages(d.messages ?? []);
      setStub(Boolean(d.stub));
    } catch {
      setError(t.account.messagesLoadFailed);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    // Soft poll so Admin replies appear without a full refresh.
    const poll = window.setInterval(() => {
      void load();
    }, 12000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(poll);
    };
  }, []);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/account/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(d.error || t.account.messageSendFailed);
      }
      setText("");
      setSuccess(t.account.messageSuccess);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.errorGeneric);
    } finally {
      setSending(false);
    }
  }

  if (loading) return <div className="h-40 animate-pulse rounded-2xl bg-beige" />;

  return (
    <div className="flex h-[28rem] flex-col rounded-2xl border border-beige-dark bg-white">
      {stub && (
        <p className="border-b border-beige-dark px-4 py-2 text-xs text-muted">
          {t.account.messagesMigrationHint}
        </p>
      )}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {!messages.length && (
          <p className="text-center text-sm text-muted">{t.account.startConversation}</p>
        )}
        {messages.map((m) => {
          const fromCustomer = m.sender === "customer";
          return (
            <div
              key={m.id}
              className={
                fromCustomer
                  ? "ms-8 rounded-2xl bg-[color:#C9A14A]/15 px-4 py-2 text-sm"
                  : "me-8 rounded-2xl bg-beige px-4 py-2 text-sm"
              }
            >
              <p className="mb-1 text-[11px] font-medium text-muted">
                {fromCustomer ? t.account.you : t.account.boutique}
              </p>
              <p className="whitespace-pre-wrap">{m.body}</p>
            </div>
          );
        })}
      </div>
      {(error || success) && (
        <div className="space-y-1 border-t border-beige-dark px-3 pt-2">
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-lg bg-gold/10 px-3 py-2 text-xs text-charcoal">
              {success}
            </p>
          ) : null}
        </div>
      )}
      <div className="flex gap-2 border-t border-beige-dark p-3">
        <input
          className="flex-1 rounded-xl border border-beige-dark px-3 py-2 text-sm"
          placeholder={t.account.messagePlaceholder}
          value={text}
          disabled={sending}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void send();
          }}
        />
        <Button
          style={{ backgroundColor: "#C9A14A" }}
          loading={sending}
          disabled={sending || !text.trim()}
          onClick={() => void send()}
        >{t.common.send}</Button>
      </div>
    </div>
  );
}
