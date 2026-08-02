"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn } from "lucide-react";
import type { GalleryItem } from "@/types";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "all", label: "الكل" },
  { value: "wedding", label: "زفاف" },
  { value: "details", label: "تفاصيل" },
  { value: "boutique", label: "البوتيك" },
  { value: "events", label: "فعاليات" },
];

interface GalleryGridProps {
  items: GalleryItem[];
}

export function GalleryGrid({ items }: GalleryGridProps) {
  const [filter, setFilter] = useState("all");
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  const filtered =
    filter === "all" ? items : items.filter((i) => i.category === filter);

  return (
    <>
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {CATEGORIES.map((cat) => (
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
            <Image
              src={item.image_url}
              alt={item.title_ar}
              width={600}
              height={800}
              className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-charcoal/60 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex w-full items-center justify-between text-white">
                <span className="text-sm font-medium">{item.title_ar}</span>
                <ZoomIn className="h-5 w-5" />
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-charcoal/90 p-4"
            onClick={() => setLightbox(null)}
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute top-6 right-6 text-white"
              aria-label="إغلاق"
            >
              <X className="h-8 w-8" />
            </button>
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-h-[90vh] max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={lightbox.image_url}
                alt={lightbox.title_ar}
                width={1200}
                height={1600}
                className="max-h-[85vh] w-auto rounded-xl object-contain"
              />
              <p className="mt-4 text-center text-lg text-white">
                {lightbox.title_ar}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
