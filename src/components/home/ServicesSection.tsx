"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Scissors, Sparkles, Crown } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";

const services = [
  {
    icon: Crown,
    title: "فساتين زفاف فاخرة",
    description: "تصاميم حصرية من أفخر الأقمشة العالمية مع تفاصيل hand-crafted",
    href: "/wedding-dresses",
  },
  {
    icon: Sparkles,
    title: "فساتين للإيجار",
    description: "إطلالة أحلامك بأسعار مناسبة مع خدمة تنظيف وصيانة مجانية",
    href: "/rental-dresses",
  },
  {
    icon: Scissors,
    title: "تعديلات مخصصة",
    description: "فريق خياطة محترف لضمان ملاءمة مثالية لجسمك",
    href: "/booking",
  },
  {
    icon: Heart,
    title: "استشارة شخصية",
    description: "جلسة خاصة مع stylist متخصص لاختيار الإطلالة المثالية",
    href: "/booking",
  },
];

export function ServicesSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeading
          subtitle="خدماتنا"
          title="تجربة فاخرة من الألف إلى الياء"
          description="نقدم لكِ تجربة متكاملة تجعل رحلة اختيار فستان أحلامك لا تُنسى"
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                href={service.href}
                className="group flex h-full flex-col rounded-2xl border border-beige-dark bg-white p-6 transition-all hover:border-gold hover:shadow-lg hover:shadow-gold/10"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold transition-colors group-hover:bg-gold group-hover:text-white">
                  <service.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-charcoal group-hover:text-gold">
                  {service.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                  {service.description}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
