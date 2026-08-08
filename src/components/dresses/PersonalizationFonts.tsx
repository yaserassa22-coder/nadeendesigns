"use client";

import {
  Amiri,
  Aref_Ruqaa,
  Noto_Naskh_Arabic,
  Lemonada,
  Reem_Kufi,
  El_Messiri,
  Cairo,
  Lateef,
  Great_Vibes,
  Allura,
  Playfair_Display,
  Parisienne,
  Dancing_Script,
  Cinzel,
  Pinyon_Script,
  Frank_Ruhl_Libre,
  Heebo,
  Rubik,
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
const fontKufi = Reem_Kufi({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-pers-kufi",
  display: "swap",
});
const fontElMessiri = El_Messiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-pers-el-messiri",
  display: "swap",
});
const fontCairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-pers-cairo",
  display: "swap",
});
const fontLateef = Lateef({
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-pers-lateef",
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
const fontParisienne = Parisienne({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-pers-parisienne",
  display: "swap",
});
const fontDancing = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-pers-dancing",
  display: "swap",
});
const fontCinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-pers-cinzel",
  display: "swap",
});
const fontPinyon = Pinyon_Script({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-pers-pinyon",
  display: "swap",
});
const fontFrankRuhl = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-pers-frank-ruhl",
  display: "swap",
});
const fontHeebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-pers-heebo",
  display: "swap",
});
const fontRubik = Rubik({
  subsets: ["hebrew", "latin", "arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-pers-rubik",
  display: "swap",
});

const fontVars = [
  fontClassicAr.variable,
  fontDiwani.variable,
  fontNaskh.variable,
  fontSignatureAr.variable,
  fontKufi.variable,
  fontElMessiri.variable,
  fontCairo.variable,
  fontLateef.variable,
  fontElegant.variable,
  fontModern.variable,
  fontClassicEn.variable,
  fontParisienne.variable,
  fontDancing.variable,
  fontCinzel.variable,
  fontPinyon.variable,
  fontFrankRuhl.variable,
  fontHeebo.variable,
  fontRubik.variable,
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
