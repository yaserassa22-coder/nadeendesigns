import { SEED_BRIDAL_ROBES, SEED_VEILS } from "@/lib/data/shop-seed";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { BridalRobe, ShopOrder, Veil } from "@/types/shop";
import type { ContactMessage } from "@/types";

export async function getAdminVeils(): Promise<Veil[]> {
  if (!isSupabaseConfigured()) return SEED_VEILS;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("veils")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return SEED_VEILS;
  return data as Veil[];
}

export async function getAdminBridalRobes(): Promise<BridalRobe[]> {
  if (!isSupabaseConfigured()) return SEED_BRIDAL_ROBES;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bridal_robes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return SEED_BRIDAL_ROBES;
  return data as BridalRobe[];
}

export async function getAdminOrders(): Promise<ShopOrder[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("shop_orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as ShopOrder[];
}

export async function getAdminMessages(): Promise<ContactMessage[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as ContactMessage[];
}
