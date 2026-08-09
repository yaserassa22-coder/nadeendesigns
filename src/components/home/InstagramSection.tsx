"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  OFFICIAL_INSTAGRAM_HANDLE,
  OFFICIAL_INSTAGRAM_URL,
  SITE_NAME,
} from "@/lib/constants";
import { HomeQuietLink } from "@/components/home/HomeQuietLink";

type InstagramSectionProps = {
  /** Admin gallery (معرض الصور) images only — never invent / never pad with products. */
  images?: { src: string; alt: string; href?: string }[];
};

/**
 * End-of-homepage gallery mosaic + Instagram visit band (no gallery title).
 */
export function InstagramSection({ images = [] }: InstagramSectionProps) {
  const { t } = useLocale();
  const tiles = images.filter((img) => Boolean(img.src.trim())).slice(0, 9);
  if (tiles.length === 0) return null;

  return (
    <section className="bg-white pb-12 pt-8 md:pb-16 md:pt-10">
      <div className="w-full px-2 sm:px-3 md:px-4">
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-3 lg:gap-3">
          {tiles.map((tile, i) => {
            const inner = (
              <div className="group relative aspect-square overflow-hidden bg-beige">
                <Image
                  src={tile.src}
                  alt={tile.alt || SITE_NAME}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  sizes="(max-width: 640px) 50vw, 33vw"
                />
              </div>
            );
            return (
              <motion.div
                key={`${tile.src}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i, 6) * 0.03, duration: 0.4 }}
              >
                <Link href={tile.href || "/gallery"} className="block">
                  {inner}
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-5 flex justify-center md:mt-6">
          <HomeQuietLink href="/gallery">{t.nav.gallery}</HomeQuietLink>
        </div>

        <div className="mt-10 flex flex-col items-center gap-2 px-2 text-center md:mt-12">
          <p className="font-[family-name:var(--font-cormorant)] text-[10px] tracking-[0.32em] text-gold uppercase md:text-xs">
            Instagram
          </p>
          <h2
            className="font-[family-name:var(--font-cormorant)] text-lg tracking-[0.12em] text-charcoal uppercase md:text-xl"
            dir="ltr"
          >
            {OFFICIAL_INSTAGRAM_HANDLE}
          </h2>
          <div className="mt-2">
            <HomeQuietLink href={OFFICIAL_INSTAGRAM_URL} external>
              {t.home.igVisit}
            </HomeQuietLink>
          </div>
        </div>
      </div>
    </section>
  );
}
