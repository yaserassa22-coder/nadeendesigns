"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface CmsLivePreviewProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

/** Shared RTL live-preview chrome for CMS editors. */
export function CmsLivePreview({
  title,
  children,
  className,
}: CmsLivePreviewProps) {
  const { t } = useLocale();
  const cu = t.admin.cmsUi;

  return (
    <div
      className={cn(
        "sticky top-6 overflow-hidden rounded-2xl border border-beige-dark bg-beige/40 shadow-sm",
        className
      )}
    >
      <div className="border-b border-beige-dark bg-white/80 px-4 py-3">
        <p className="text-xs font-medium tracking-wide text-muted">
          {title ?? cu.livePreviewTitle}
        </p>
        <p className="mt-0.5 text-[11px] text-muted/80">{cu.livePreviewHint}</p>
      </div>
      <div dir="rtl" className="max-h-[70vh] overflow-y-auto p-4">
        {children}
      </div>
    </div>
  );
}
