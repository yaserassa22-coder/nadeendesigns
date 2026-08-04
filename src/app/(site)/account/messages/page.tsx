"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

type Msg = {
  id: string;
  sender: string;
  body: string;
  created_at?: string;
};

export default function AccountMessagesPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [stub, setStub] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const d = await fetch("/api/account/messages").then((r) => r.json());
    setMessages(d.messages ?? []);
    setStub(Boolean(d.stub));
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function send() {
    if (!text.trim()) return;
    await fetch("/api/account/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    setText("");
    void load();
  }

  if (loading) return <div className="h-40 animate-pulse rounded-2xl bg-beige" />;

  return (
    <div className="flex h-[28rem] flex-col rounded-2xl border border-beige-dark bg-white">
      {stub && (
        <p className="border-b border-beige-dark px-4 py-2 text-xs text-muted">
          محادثة البوتيك جاهزة بعد ترحيل قاعدة البيانات — المرفقات لاحقاً.
        </p>
      )}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {!messages.length && (
          <p className="text-center text-sm text-muted">ابدئي المحادثة مع البوتيك.</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.sender === "customer"
                ? "ms-8 rounded-2xl bg-[color:#C9A14A]/15 px-4 py-2 text-sm"
                : "me-8 rounded-2xl bg-beige px-4 py-2 text-sm"
            }
          >
            {m.body}
          </div>
        ))}
      </div>
      <div className="flex gap-2 border-t border-beige-dark p-3">
        <input
          className="flex-1 rounded-xl border border-beige-dark px-3 py-2 text-sm"
          placeholder="اكتبني رسالتك…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void send();
          }}
        />
        <Button style={{ backgroundColor: "#C9A14A" }} onClick={() => void send()}>
          إرسال
        </Button>
      </div>
    </div>
  );
}
