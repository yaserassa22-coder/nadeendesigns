"use client";

import type { ListVisibility } from "@/lib/admin/lifecycle-types";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

type VisibilityFilterProps = {
  value: ListVisibility;
  onChange: (value: ListVisibility) => void;
  className?: string;
};

export function VisibilityFilter({
  value,
  onChange,
  className,
}: VisibilityFilterProps) {
  const { t } = useLocale();
  const lu = t.admin.lifecycleUi;
  const options: { value: ListVisibility; label: string }[] = [
    { value: "active", label: lu.filterActive },
    { value: "archived", label: lu.filterArchived },
    { value: "all", label: lu.filterAll },
  ];

  return (
    <div className={cn("flex flex-wrap gap-1 rounded-xl bg-beige/40 p-1", className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm transition-colors",
            value === opt.value
              ? "bg-white text-charcoal shadow-sm"
              : "text-muted hover:text-charcoal"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
