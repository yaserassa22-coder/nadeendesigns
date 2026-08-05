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
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-gold">
          ✨ محرك التجربة
        </p>
        <h1 className="mt-1 text-3xl font-bold text-charcoal">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-muted">{description}</p>
        ) : null}
      </div>
      <ExperienceEngineNav />
      {children}
    </div>
  );
}
