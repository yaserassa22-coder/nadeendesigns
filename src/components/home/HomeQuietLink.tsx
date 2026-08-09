import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/** Understated collection / view link — no gold pill chrome. */
export function HomeQuietLink({
  href,
  children,
  className,
  external,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  external?: boolean;
}) {
  const classNames = cn(
    "group/link inline-flex items-center gap-2 text-sm tracking-[0.12em] text-charcoal/70 transition-colors hover:text-gold",
    className
  );

  const content = (
    <>
      <span>{children}</span>
      <ArrowLeft className="h-3.5 w-3.5 shrink-0 transition-transform duration-300 ltr:rotate-180 group-hover/link:-translate-x-0.5 ltr:group-hover/link:translate-x-0.5" />
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classNames}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={classNames}>
      {content}
    </Link>
  );
}
