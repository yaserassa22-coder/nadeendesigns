"use client";

import { Archive, ArchiveRestore, RotateCcw, Trash2 } from "lucide-react";
import type { LifecycleModule } from "@/lib/admin/lifecycle-types";
import { postLifecycle } from "@/lib/admin/lifecycle-client";

type RowLifecycleActionsProps = {
  module: LifecycleModule;
  id: string;
  archived?: boolean;
  onChanged: (kind: "archive" | "unarchive" | "soft_delete") => void;
  onError?: (message: string) => void;
  busy?: boolean;
};

export function RowLifecycleActions({
  module,
  id,
  archived = false,
  onChanged,
  onError,
  busy = false,
}: RowLifecycleActionsProps) {
  const run = async (action: "archive" | "unarchive" | "soft_delete") => {
    const result = await postLifecycle({ action, module, id });
    if (!result.ok) {
      onError?.(result.error);
      return;
    }
    onChanged(action);
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {archived ? (
        <button
          type="button"
          disabled={busy}
          title="إلغاء الأرشفة"
          onClick={() => void run("unarchive")}
          className="rounded-lg p-2 text-muted hover:bg-beige hover:text-charcoal disabled:opacity-50"
        >
          <ArchiveRestore className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          title="أرشفة"
          onClick={() => void run("archive")}
          className="rounded-lg p-2 text-muted hover:bg-beige hover:text-charcoal disabled:opacity-50"
        >
          <Archive className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        title="نقل إلى سلة المحذوفات"
        onClick={() => void run("soft_delete")}
        className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function RestoreButton({
  module,
  id,
  onRestored,
  onError,
}: {
  module: LifecycleModule;
  id: string;
  onRestored: () => void;
  onError?: (message: string) => void;
}) {
  return (
    <button
      type="button"
      title="استعادة"
      onClick={async () => {
        const result = await postLifecycle({
          action: "restore",
          module,
          id,
        });
        if (!result.ok) {
          onError?.(result.error);
          return;
        }
        onRestored();
      }}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-gold hover:bg-beige"
    >
      <RotateCcw className="h-3.5 w-3.5" />
      استعادة
    </button>
  );
}
