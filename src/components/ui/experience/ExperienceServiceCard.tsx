"use client";

import { Check, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  description?: string | null;
  priceLabel: string;
  selected: boolean;
  required?: boolean;
  disabled?: boolean;
  onToggle: () => void;
  className?: string;
};

/**
 * Luxury selectable service card — large tap target, gift icon, FREE/+₪, Select.
 * Replaces plain checkboxes in modal + PDP experience surfaces.
 */
export function ExperienceServiceCard({
  name,
  description,
  priceLabel,
  selected,
  required = false,
  disabled = false,
  onToggle,
  className,
}: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-disabled={required || disabled || undefined}
      disabled={disabled}
      onClick={() => {
        if (required || disabled) return;
        onToggle();
      }}
      className={cn(
        "group flex w-full items-center gap-4 rounded-[var(--xp-card-radius)] border px-4 py-4 text-start transition-all",
        "min-h-[4.5rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/45 focus-visible:ring-offset-2",
        selected
          ? "border-[color:var(--xp-border-selected)] bg-[color:var(--xp-surface-selected)] shadow-[var(--xp-shadow)]"
          : "border-[color:var(--xp-border)] bg-white hover:border-gold/35",
        required ? "cursor-default" : "cursor-pointer",
        className
      )}
      style={{ transitionDuration: "var(--xp-transition)" }}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors",
          selected
            ? "bg-gold/15 text-gold"
            : "bg-beige text-muted group-hover:text-gold"
        )}
        aria-hidden
      >
        <Gift className="h-5 w-5" strokeWidth={1.6} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-charcoal md:text-base">
            {name}
          </span>
          {required ? (
            <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium tracking-wide text-gold">
              إلزامي
            </span>
          ) : null}
        </span>
        {description ? (
          <span className="mt-0.5 block text-xs text-muted md:text-sm">
            {description}
          </span>
        ) : null}
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <span
          className="text-sm font-semibold text-gold tabular-nums"
          dir="ltr"
        >
          {priceLabel}
        </span>
        <span
          className={cn(
            "inline-flex min-w-[4.5rem] items-center justify-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium tracking-wide transition-colors",
            selected
              ? "bg-gold text-white"
              : "border border-beige-dark bg-ivory text-muted group-hover:border-gold/40 group-hover:text-charcoal"
          )}
        >
          {selected ? (
            <>
              <Check className="h-3 w-3" strokeWidth={2.25} />
              محدد
            </>
          ) : (
            "اختاري"
          )}
        </span>
      </span>
    </button>
  );
}
