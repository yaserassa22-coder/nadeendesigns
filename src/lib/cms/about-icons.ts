import { Award, Heart, Sparkles, Users, type LucideIcon } from "lucide-react";
import type { AboutValueIcon } from "@/types";

export const ABOUT_ICON_MAP: Record<AboutValueIcon, LucideIcon> = {
  Heart,
  Sparkles,
  Users,
  Award,
};

export const ABOUT_ICON_OPTIONS: { value: AboutValueIcon; label: string }[] = [
  { value: "Heart", label: "قلب" },
  { value: "Sparkles", label: "بريق" },
  { value: "Users", label: "أشخاص" },
  { value: "Award", label: "جائزة" },
];

export function resolveAboutIcon(icon: string | undefined): LucideIcon {
  if (icon && icon in ABOUT_ICON_MAP) {
    return ABOUT_ICON_MAP[icon as AboutValueIcon];
  }
  return Heart;
}
