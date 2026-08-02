import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, hint, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-beige-dark bg-white p-6 shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{title}</p>
          <p className="mt-2 font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-charcoal">
            {value}
          </p>
          {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/10 text-gold">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
