"use client";

import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

type BulkActionBarProps = {
  selectedCount: number;
  onArchive?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  onClear: () => void;
  mode?: "list" | "trash";
};

export function BulkActionBar({
  selectedCount,
  onArchive,
  onDelete,
  onRestore,
  onClear,
  mode = "list",
}: BulkActionBarProps) {
  if (selectedCount <= 0) return null;

  return (
    <div className="sticky bottom-4 z-20 mx-auto flex w-fit flex-wrap items-center gap-2 rounded-2xl border border-beige-dark bg-white px-4 py-3 shadow-lg">
      <span className="text-sm text-muted">تم تحديد {selectedCount}</span>
      {mode === "list" && onArchive ? (
        <Button variant="outline" onClick={onArchive}>
          <Archive className="h-4 w-4" />
          أرشفة
        </Button>
      ) : null}
      {mode === "list" && onDelete ? (
        <Button
          variant="outline"
          className="border-red-200 text-red-700 hover:bg-red-50"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
          نقل للسلة
        </Button>
      ) : null}
      {mode === "trash" && onRestore ? (
        <Button variant="outline" onClick={onRestore}>
          <RotateCcw className="h-4 w-4" />
          استعادة
        </Button>
      ) : null}
      {mode === "trash" && onDelete ? (
        <Button
          variant="outline"
          className="border-red-200 text-red-700 hover:bg-red-50"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
          حذف نهائي
        </Button>
      ) : null}
      <button
        type="button"
        onClick={onClear}
        className="text-sm text-muted underline-offset-2 hover:underline"
      >
        إلغاء التحديد
      </button>
    </div>
  );
}
