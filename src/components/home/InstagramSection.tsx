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
  /** Existing gallery / product images only — never invented. */
  images?: { src: string; alt: string; href?: string }[];
};

export function InstagramSection({ images = [] }: InstagramSectionProps) {
  const { t } = useLocale();
  const tiles = images.filter((img) => Boolean(img.src.trim())).slice(0, 9);

  return (
    <section className="bg-ivory pt-8 md:pt-10">
      <div className="w-full px-1 sm:px-1.5">
        <div className="mb-4 px-2 text-center md:mb-5">
          <p className="font-[family-name:var(--font-cormorant)] text-[10px] tracking-[0.32em] text-gold uppercase md:text-xs">
            Instagram
          </p>
          <h2
            className="mt-2 font-[family-name:var(--font-cormorant)] text-lg tracking-[0.12em] text-charcoal uppercase md:text-xl"
            dir="ltr"
          >
            {OFFICIAL_INSTAGRAM_HANDLE}
          </h2>
        </div>

        {tiles.length > 0 ? (
          <div className="grid grid-cols-2 gap-1 sm:gap-1.5 lg:grid-cols-3 lg:gap-1.5">
            {tiles.map((tile, i) => {
              const inner = (
                <div className="group relative aspect-[4/5] overflow-hidden bg-beige lg:aspect-square">
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
                  transition={{ delay: i * 0.03, duration: 0.4 }}
                >
                  {tile.href ? (
                    <Link href={tile.href} className="block">
                      {inner}
                    </Link>
                  ) : (
                    <a
                      href={OFFICIAL_INSTAGRAM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      {inner}
                    </a>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : null}

        <div className="mt-5 flex justify-center pb-2 md:mt-6">
          <HomeQuietLink href={OFFICIAL_INSTAGRAM_URL} external>
            {t.home.igVisit}
          </HomeQuietLink>
        </div>
      </div>
    </section>
  );
}
