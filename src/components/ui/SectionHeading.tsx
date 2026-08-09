"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  subtitle?: string;
  title: string;
  description?: string;
  align?: "center" | "right";
  /** Quiet editorial heading for image-led homepage sections. */
  variant?: "default" | "quiet";
  className?: string;
}

export function SectionHeading({
  subtitle,
  title,
  description,
  align = "center",
  variant = "default",
  className,
}: SectionHeadingProps) {
  const quiet = variant === "quiet";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6 }}
      className={cn(
        quiet ? "mb-8 md:mb-10" : "mb-12 md:mb-16",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className
      )}
    >
      {subtitle && (
        <p
          className={cn(
            "font-[family-name:var(--font-cormorant)] tracking-[0.3em] text-gold uppercase",
            quiet ? "mb-2 text-xs" : "mb-3 text-sm"
          )}
        >
          {subtitle}
        </p>
      )}
      <h2
        className={cn(
          "text-charcoal",
          quiet
            ? "text-2xl font-normal tracking-wide md:text-3xl lg:text-[2.15rem]"
            : "text-3xl font-bold md:text-4xl lg:text-5xl"
        )}
      >
        {title}
      </h2>
      <div
        className={cn(
          "decorative-line mx-auto",
          quiet ? "mt-3 w-16" : "mt-4 w-24"
        )}
      />
      {description && (
        <p
          className={cn(
            "mx-auto text-muted",
            quiet
              ? "mt-3 max-w-lg text-sm leading-relaxed md:text-base"
              : "mt-6 max-w-2xl text-lg leading-relaxed"
          )}
        >
          {description}
        </p>
      )}
    </motion.div>
  );
}
