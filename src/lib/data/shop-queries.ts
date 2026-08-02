import { SEED_BRIDAL_ROBES, SEED_VEILS } from "@/lib/data/shop-seed";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { BridalRobe, Veil } from "@/types/shop";

export async function getVeils(): Promise<Veil[]> {
  if (!isSupabaseConfigured()) return SEED_VEILS;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("veils")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return SEED_VEILS;
  return data as Veil[];
}

export async function getVeilById(id: string): Promise<Veil | null> {
  if (!isSupabaseConfigured()) {
    return SEED_VEILS.find((v) => v.id === id) ?? null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("veils")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    return SEED_VEILS.find((v) => v.id === id) ?? null;
  }
  return data as Veil;
}

export async function getBridalRobes(): Promise<BridalRobe[]> {
  if (!isSupabaseConfigured()) return SEED_BRIDAL_ROBES;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bridal_robes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return SEED_BRIDAL_ROBES;
  return data as BridalRobe[];
}

export async function getBridalRobeById(id: string): Promise<BridalRobe | null> {
  if (!isSupabaseConfigured()) {
    return SEED_BRIDAL_ROBES.find((r) => r.id === id) ?? null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bridal_robes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    return SEED_BRIDAL_ROBES.find((r) => r.id === id) ?? null;
  }
  return data as BridalRobe;
}
