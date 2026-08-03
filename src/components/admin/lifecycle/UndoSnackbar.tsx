"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

type UndoSnackbarProps = {
  message: string | null;
  undoLabel?: string;
  onUndo?: () => void;
  onDismiss: () => void;
  durationMs?: number;
};

export function UndoSnackbar({
  message,
  undoLabel = "تراجع",
  onUndo,
  onDismiss,
  durationMs = 5000,
}: UndoSnackbarProps) {
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(t);
  }, [message, durationMs, onDismiss]);

  if (!message) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[70] w-[min(440px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-beige-dark bg-charcoal px-4 py-3 text-sm text-white shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 flex-1">{message}</p>
        <div className="flex shrink-0 items-center gap-2">
          {onUndo ? (
            <Button
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
              onClick={onUndo}
            >
              {undoLabel}
            </Button>
          ) : null}
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg px-2 py-1 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
