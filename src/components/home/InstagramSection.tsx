"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Camera } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { INSTAGRAM_IMAGES } from "@/lib/data/seed";

interface InstagramSectionProps {
  instagramUrl: string;
  handle: string;
}

export function InstagramSection({ instagramUrl, handle }: InstagramSectionProps) {
  return (
    <section className="bg-beige/40 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeading
          subtitle="تابعينا"
          title="على إنستغرام"
          description="اكتشفي أحدث إطلالات عروسنا و behind-the-scenes من البوتيك"
        />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-6">
          {INSTAGRAM_IMAGES.map((src, i) => (
            <motion.a
              key={src}
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ scale: 1.03 }}
              className="group relative aspect-square overflow-hidden rounded-xl"
            >
              <Image
                src={src}
                alt={`Instagram ${i + 1}`}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                sizes="(max-width: 768px) 50vw, 16vw"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-charcoal/0 transition-colors group-hover:bg-charcoal/40">
                <Camera className="h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </motion.a>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-[family-name:var(--font-cormorant)] text-xl text-gold transition-colors hover:text-gold-dark"
          >
            <Camera className="h-5 w-5" />
            {handle}
          </Link>
        </div>
      </div>
    </section>
  );
}
