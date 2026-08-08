"use client";

import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { WHATSAPP_MESSAGE } from "@/lib/constants";
import { useLocale } from "@/components/i18n/LocaleProvider";

interface WhatsAppButtonProps {
  whatsapp: string;
}

export function WhatsAppButton({ whatsapp }: WhatsAppButtonProps) {
  const { t } = useLocale();
  const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <motion.a
      data-storefront-chrome
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: "spring", stiffness: 200 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-6 left-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 transition-shadow hover:shadow-xl"
      aria-label={t.nav.contact}
    >
      <MessageCircle className="h-7 w-7" />
    </motion.a>
  );
}
