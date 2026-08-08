import Link from "next/link";
import { cn } from "@/lib/utils";

export type AccessoriesBrowseItem = {
  id: string;
  href: string;
  label: string;
  count: number;
};

type Props = {
  parentLabel: string;
  parentHref: string;
  parentActive: boolean;
  parentCount: number;
  items: AccessoriesBrowseItem[];
  activeId: string | null;
  navAriaLabel: string;
  className?: string;
};

export function AccessoriesBrowseSidebar({
  parentLabel,
  parentHref,
  parentActive,
  parentCount,
  items,
  activeId,
  navAriaLabel,
  className,
}: Props) {
  return (
    <nav
      aria-label={navAriaLabel}
      className={cn("space-y-1 text-sm", className)}
    >
      <Link
        href={parentHref}
        className={cn(
          "block border-s-2 px-3 py-2.5 font-medium transition-colors",
          parentActive
            ? "border-gold bg-beige/50 text-charcoal"
            : "border-transparent text-charcoal hover:border-beige-dark hover:bg-beige/40"
        )}
      >
        {parentLabel}
        <span
          className={cn(
            "ms-1",
            parentActive ? "text-charcoal/70" : "text-muted"
          )}
        >
          ({parentCount})
        </span>
      </Link>

      <div className="ms-1 space-y-0.5 border-s border-beige-dark/70 pe-1">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "block px-3 py-2 transition-colors",
                active
                  ? "bg-gold text-white"
                  : "text-charcoal hover:bg-beige/60"
              )}
            >
              {item.label}
              <span
                className={cn(
                  "ms-1",
                  active ? "text-white/80" : "text-muted"
                )}
              >
                ({item.count})
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
