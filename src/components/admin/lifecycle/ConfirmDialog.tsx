"use client";

import { Button } from "@/components/ui/Button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-charcoal/40"
        aria-label="إغلاق"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-2xl border border-beige-dark bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-charcoal">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            loading={loading}
            className={
              danger
                ? "bg-red-600 text-white hover:bg-red-700"
                : undefined
            }
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
