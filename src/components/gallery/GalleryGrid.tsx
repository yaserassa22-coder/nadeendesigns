"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn } from "lucide-react";
import type { GalleryItem } from "@/types";
import { isGalleryVideo } from "@/lib/gallery/media";
import {
  orderGalleryCategories,
  resolveGalleryCategoryLabel,
  type GalleryCategory,
} from "@/lib/gallery/categories";
import { GalleryLoopVideo } from "@/components/media/GalleryLoopVideo";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/LocaleProvider";

interface GalleryGridProps {
  items: GalleryItem[];
  categories: GalleryCategory[];
}

export function GalleryGrid({ items, categories }: GalleryGridProps) {
  const { t, locale } = useLocale();
  const [filter, setFilter] = useState("all");
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  const filters = useMemo(
    () => [
      { value: "all", label: t.galleryUi.all },
      ...orderGalleryCategories(categories).map((cat) => ({
        value: cat.slug,
        label: resolveGalleryCategoryLabel(cat, locale),
      })),
    ],
    [categories, locale, t.galleryUi.all]
  );

  const filtered =
    filter === "all" ? items : items.filter((i) => i.category === filter);

  return (
    <>
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {filters.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setFilter(cat.value)}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-medium transition-colors",
              filter === cat.value
                ? "bg-gold text-white"
                : "bg-beige text-charcoal hover:bg-gold/20"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {filtered.map((item, i) => (
          <motion.button
            key={item.id}
            type="button"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setLightbox(item)}
            className="group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-xl"
          >
            {isGalleryVideo(item) && item.video_url ? (
              <GalleryLoopVideo
                src={item.video_url}
                poster={item.image_url || undefined}
                alt={item.title_ar}
                className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <Image
                src={item.image_url}
                alt={item.title_ar}
                width={600}
                height={800}
                className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            )}
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-charcoal/60 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex w-full items-center justify-between gap-2">
                <p className="text-sm font-medium text-ivory">{item.title_ar}</p>
                <ZoomIn className="h-4 w-4 shrink-0 text-ivory/80" />
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {lightbox ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/80 p-4"
            onClick={() => setLightbox(null)}
          >
            <button
              type="button"
              className="absolute top-4 end-4 rounded-full bg-ivory/90 p-2 text-charcoal"
              onClick={() => setLightbox(null)}
              aria-label={t.common.close}
            >
              <X className="h-5 w-5" />
            </button>
            <motion.div
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.96 }}
              className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {isGalleryVideo(lightbox) && lightbox.video_url ? (
                <GalleryLoopVideo
                  src={lightbox.video_url}
                  poster={lightbox.image_url || undefined}
                  alt={lightbox.title_ar}
                  controls
                  className="max-h-[90vh] w-auto max-w-full"
                />
              ) : (
                <Image
                  src={lightbox.image_url}
                  alt={lightbox.title_ar}
                  width={1200}
                  height={1600}
                  className="max-h-[90vh] w-auto object-contain"
                />
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
