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
  titleSize?: "sm" | "md" | "lg";
  priority?: boolean;
  className?: string;
  /** Default tall editorial frame. */
  aspectClassName?: string;
  sizes?: string;
};

/**
 * Full-bleed editorial tile: photography first, quiet overlay type + understated CTA.
 */
export function HomeEditorialTile({
  href,
  imageUrl,
  title,
  eyebrow,
  ctaLabel,
  ctaVariant = "quiet",
  titleSize = "md",
  priority = false,
  className,
  aspectClassName = "aspect-[3/4]",
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 33vw",
}: HomeEditorialTileProps) {
  const cover = imageUrl?.trim() || "";

  return (
    <Link
      href={href}
      className={cn("group relative block h-full overflow-hidden bg-beige", className)}
    >
      <div className={cn("relative w-full overflow-hidden", aspectClassName)}>
        {cover ? (
          <Image
            src={cover}
            alt={title}
            fill
            priority={priority}
            quality={85}
            sizes={sizes}
            className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-beige via-beige-dark/70 to-beige-dark" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-charcoal/15 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-start gap-1.5 p-4 md:gap-2 md:p-5 lg:p-6">
          {eyebrow ? (
            <p className="text-[9px] font-medium tracking-[0.28em] text-ivory/80 uppercase md:text-[10px]">
              {eyebrow}
            </p>
          ) : null}
          <h3
            className={cn(
              "max-w-[18ch] font-[family-name:var(--font-cormorant)] leading-tight tracking-[0.06em] text-ivory uppercase",
              titleSize === "lg" && "text-2xl md:text-3xl lg:text-[2.15rem]",
              titleSize === "md" && "text-xl md:text-2xl lg:text-[1.65rem]",
              titleSize === "sm" && "text-base md:text-lg"
            )}
          >
            {title}
          </h3>
          {ctaLabel ? (
            ctaVariant === "outline" ? (
              <span className="mt-1 inline-flex border border-ivory/90 bg-ivory/95 px-4 py-2 text-[10px] font-medium tracking-[0.2em] text-charcoal uppercase transition-colors duration-300 group-hover:bg-ivory md:text-[11px]">
                {ctaLabel}
              </span>
            ) : (
              <span className="mt-0.5 text-[10px] tracking-[0.18em] text-ivory/75 uppercase transition-colors duration-300 group-hover:text-ivory md:text-[11px]">
                {ctaLabel}
              </span>
            )
          ) : null}
        </div>
      </div>
    </Link>
  );
}
