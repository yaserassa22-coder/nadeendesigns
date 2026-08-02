"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  subtitle?: string;
  title: string;
  description?: string;
  align?: "center" | "right";
  className?: string;
}

export function SectionHeading({
  subtitle,
  title,
  description,
  align = "center",
  className,
}: SectionHeadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6 }}
      className={cn(
        "mb-12 md:mb-16",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className
      )}
    >
      {subtitle && (
        <p className="mb-3 font-[family-name:var(--font-cormorant)] text-sm tracking-[0.3em] text-gold uppercase">
          {subtitle}
        </p>
      )}
      <h2 className="text-3xl font-bold text-charcoal md:text-4xl lg:text-5xl">
        {title}
      </h2>
      <div className="decorative-line mx-auto mt-4 w-24" />
      {description && (
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          {description}
        </p>
      )}
    </motion.div>
  );
}
