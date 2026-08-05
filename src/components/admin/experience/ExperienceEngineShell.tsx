import type { ReactNode } from "react";
import { ExperienceEngineNav } from "@/components/admin/experience/ExperienceEngineNav";

export function ExperienceEngineShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium tracking-wide text-gold">
          لوحة التجربة
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-cormorant)] text-4xl tracking-wide text-charcoal">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </div>
      <ExperienceEngineNav />
      {children}
    </div>
  );
}
