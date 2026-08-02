"use client";

import {
  Amiri,
  Aref_Ruqaa,
  Noto_Naskh_Arabic,
  Lemonada,
  Great_Vibes,
  Allura,
  Playfair_Display,
} from "next/font/google";
import { cn } from "@/lib/utils";

const fontClassicAr = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  variable: "--font-pers-classic-ar",
  display: "swap",
});
const fontDiwani = Aref_Ruqaa({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  variable: "--font-pers-diwani",
  display: "swap",
});
const fontNaskh = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-pers-naskh",
  display: "swap",
});
const fontSignatureAr = Lemonada({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-pers-signature-ar",
  display: "swap",
});
const fontElegant = Great_Vibes({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-pers-elegant",
  display: "swap",
});
const fontModern = Allura({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-pers-modern",
  display: "swap",
});
const fontClassicEn = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-pers-classic-en",
  display: "swap",
});

const fontVars = [
  fontClassicAr.variable,
  fontDiwani.variable,
  fontNaskh.variable,
  fontSignatureAr.variable,
  fontElegant.variable,
  fontModern.variable,
  fontClassicEn.variable,
].join(" ");

export function PersonalizationFonts({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(fontVars, className)}>{children}</div>;
}
