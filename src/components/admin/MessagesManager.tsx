"use client";

import { useMemo, useState } from "react";
import type { ContactMessage } from "@/types";
import { formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/Input";

interface MessagesManagerProps {
  initialMessages: ContactMessage[];
}

export function MessagesManager({ initialMessages }: MessagesManagerProps) {
  const [messages] = useState(initialMessages);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q)
    );
  }, [messages, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">💬 الرسائل</h1>
        <p className="mt-1 text-sm text-muted">رسائل نموذج التواصل</p>
      </div>
      <Input
        label="بحث"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="الاسم، البريد، الموضوع..."
      />
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
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-charcoal">{m.subject}</h3>
                  <p className="text-sm text-muted">
                    {m.name} · <span dir="ltr">{m.email}</span>
                    {m.phone ? ` · ${m.phone}` : ""}
                  </p>
                </div>
                <p className="text-xs text-muted">{formatDate(m.created_at)}</p>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-charcoal">
                {m.message}
              </p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
