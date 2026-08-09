"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type HomeEditorialTileProps = {
  href: string;
  imageUrl: string | null | undefined;
  title: string;
  /** Small caps line above the title (e.g. collection eyebrow). */
  eyebrow?: string;
  /** CTA on the image — quiet text link by default for homepage gallery. */
  ctaLabel?: string;
  ctaVariant?: "quiet" | "outline";
  /** Optional second CTA (custom design booking). */
  secondaryHref?: string;
  secondaryCtaLabel?: string;
  titleSize?: "sm" | "md" | "lg";
  priority?: boolean;
  className?: string;
  /** Default tall editorial frame. */
  aspectClassName?: string;
  sizes?: string;
  /** Feature / wide tiles get slightly stronger type; standard tiles stay quieter. */
  emphasize?: boolean;
};

/**
 * Full-bleed editorial tile: photography first, restrained type + quiet CTA.
 */
export function HomeEditorialTile({
  href,
  imageUrl,
  title,
  eyebrow,
  ctaLabel,
  ctaVariant = "quiet",
  secondaryHref,
  secondaryCtaLabel,
  titleSize = "md",
  priority = false,
  className,
  aspectClassName = "aspect-[3/4]",
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 33vw",
  emphasize = false,
}: HomeEditorialTileProps) {
  const cover = imageUrl?.trim() || "";
  const hasSecondary = Boolean(secondaryHref && secondaryCtaLabel);

  const media = (
    <div className={cn("relative w-full overflow-hidden", aspectClassName)}>
      {cover ? (
        <Image
          src={cover}
          alt={title}
          fill
          priority={priority}
          quality={85}
          sizes={sizes}
          className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-beige via-beige-dark/70 to-beige-dark" />
      )}

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-[1] bg-gradient-to-t to-transparent",
          emphasize
            ? "h-[42%] from-charcoal/45 via-charcoal/15"
            : "h-[36%] from-charcoal/35 via-charcoal/10"
        )}
      />

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 flex flex-col items-start",
          emphasize
            ? "gap-1.5 p-4 md:gap-2 md:p-6 lg:p-7"
            : "gap-1 p-3.5 md:gap-1.5 md:p-4 lg:p-5"
        )}
      >
        {eyebrow ? (
          <p className="text-[9px] font-medium tracking-[0.3em] text-ivory/70 uppercase md:text-[10px]">
            {eyebrow}
          </p>
        ) : null}
        <h3
          className={cn(
            "max-w-[20ch] font-[family-name:var(--font-cormorant)] leading-tight tracking-[0.08em] text-ivory uppercase",
            titleSize === "lg" && "text-xl md:text-2xl lg:text-[1.85rem]",
            titleSize === "md" && "text-base md:text-lg lg:text-xl",
            titleSize === "sm" && "text-sm md:text-base"
          )}
        >
          {title}
        </h3>
        {hasSecondary ? (
          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-2">
            {ctaLabel ? (
              <Link
                href={href}
                className="relative z-20 border-b border-ivory/45 pb-0.5 text-[10px] tracking-[0.18em] text-ivory/80 uppercase transition-colors hover:border-ivory hover:text-ivory md:text-[11px]"
              >
                {ctaLabel}
              </Link>
            ) : null}
            <Link
              href={secondaryHref!}
              className="relative z-20 text-[10px] tracking-[0.18em] text-ivory/65 uppercase transition-colors hover:text-ivory md:text-[11px]"
            >
              {secondaryCtaLabel}
            </Link>
          </div>
        ) : ctaLabel ? (
          ctaVariant === "outline" ? (
            <span className="mt-1 inline-flex border border-ivory/90 bg-ivory/95 px-4 py-2 text-[10px] font-medium tracking-[0.2em] text-charcoal uppercase transition-colors duration-300 group-hover:bg-ivory md:text-[11px]">
              {ctaLabel}
            </span>
          ) : (
            <span
              className={cn(
                "border-b border-ivory/45 pb-0.5 text-[10px] tracking-[0.2em] text-ivory/80 uppercase transition-colors duration-300 group-hover:border-ivory group-hover:text-ivory md:text-[11px]",
                emphasize ? "mt-1" : "mt-0.5"
              )}
            >
              {ctaLabel}
            </span>
          )
        ) : null}
      </div>
    </div>
  );

  const shellClass = cn(
    "group relative block h-full overflow-hidden bg-beige",
    className
  );

  if (hasSecondary) {
    return (
      <div className={shellClass}>
        <Link
          href={href}
          className="absolute inset-0 z-[1]"
          aria-label={title}
        />
        {media}
      </div>
    );
  }

  return (
    <Link href={href} className={shellClass}>
      {media}
    </Link>
  );
}
