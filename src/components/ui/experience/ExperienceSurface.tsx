import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
};

/** Shared soft surface for experience cards / accordions / summaries. */
export function ExperienceSurface({
  children,
  className,
  as: Tag = "div",
}: Props) {
  return (
    <Tag
      className={cn(
        "rounded-[var(--xp-card-radius-lg)] border border-[color:var(--xp-border)] bg-[color:var(--xp-surface)]",
        className
      )}
    >
      {children}
    </Tag>
  );
}
