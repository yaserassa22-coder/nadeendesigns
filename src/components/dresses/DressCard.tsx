"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Dress } from "@/types";
import { formatPrice } from "@/lib/utils";

interface DressCardProps {
  dress: Dress;
  index?: number;
}

export function DressCard({ dress, index = 0 }: DressCardProps) {
  const price = dress.price ?? dress.rental_price;
  const isRental = dress.category === "rental" || (!dress.price && dress.rental_price);

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-xl"
    >
      <Link href={`/dresses/${dress.id}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden">
          <Image
            src={dress.images[0]}
            alt={dress.name_ar}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {dress.is_featured && (
            <span className="absolute top-4 right-4 rounded-full bg-gold px-3 py-1 text-xs font-medium text-white">
              مميز
            </span>
          )}
          {!dress.is_available && (
            <div className="absolute inset-0 flex items-center justify-center bg-charcoal/50">
              <span className="rounded-full bg-white px-4 py-2 text-sm font-medium">
                غير متوفر
              </span>
            </div>
          )}
        </div>
        <div className="p-5">
          <h3 className="text-lg font-semibold text-charcoal transition-colors group-hover:text-gold">
            {dress.name_ar}
          </h3>
          {dress.style && (
            <p className="mt-1 text-sm text-muted">{dress.style}</p>
          )}
          {price && (
            <p className="mt-3 font-[family-name:var(--font-cormorant)] text-xl text-gold">
              {formatPrice(price)}
              {isRental && (
                <span className="mr-1 text-sm text-muted">/ إيجار</span>
              )}
            </p>
          )}
        </div>
      </Link>
    </motion.article>
  );
}
