"use client";

import { useMemo, useState } from "react";
import type { ContactMessage } from "@/types";
import type { ListVisibility } from "@/lib/admin/lifecycle-types";
import { filterLifecycleRows } from "@/lib/admin/query-lifecycle";
import { postLifecycle } from "@/lib/admin/lifecycle-client";
import { formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { RowLifecycleActions } from "@/components/admin/lifecycle/RowLifecycleActions";
import { UndoSnackbar } from "@/components/admin/lifecycle/UndoSnackbar";
import { VisibilityFilter } from "@/components/admin/lifecycle/VisibilityFilter";

interface MessagesManagerProps {
  initialMessages: ContactMessage[];
}

export function MessagesManager({ initialMessages }: MessagesManagerProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState<ListVisibility>("active");
  const [snack, setSnack] = useState<string | null>(null);
  const [lastDeletedId, setLastDeletedId] = useState<string | null>(null);

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
        m.message.toLowerCase().includes(q)
    );
  }, [messages, search, visibility]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">💬 الرسائل</h1>
          <p className="mt-1 text-sm text-muted">رسائل نموذج التواصل</p>
        </div>
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
          placeholder="الاسم، البريد، الموضوع..."
        />
        <div>
          <p className="mb-1.5 text-sm text-muted">العرض</p>
          <VisibilityFilter value={visibility} onChange={setVisibility} />
        </div>
      </div>
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
                <div className="flex items-center gap-3">
                  <p className="text-xs text-muted">{formatDate(m.created_at)}</p>
                  <RowLifecycleActions
                    module="messages"
                    id={m.id}
                    archived={Boolean(
                      (m as ContactMessage & { archived_at?: string | null })
                        .archived_at
                    )}
                    onChanged={(kind) => {
                      if (kind === "soft_delete") {
                        setLastDeletedId(m.id);
                        setMessages((prev) => prev.filter((x) => x.id !== m.id));
                        setSnack("تم نقل الرسالة إلى سلة المحذوفات");
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
                    }}
                    onError={(msg) => alert(msg)}
                  />
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-charcoal">
                {m.message}
              </p>
            </article>
          ))
        )}
      </div>

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
                const res = await fetch("/api/messages", { cache: "no-store" });
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
