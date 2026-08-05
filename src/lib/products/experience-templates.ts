/**
 * DB-backed product experience templates.
 */

import {
  normalizeProductExperienceConfig,
  type ExperienceTemplateRow,
  type ProductExperienceConfig,
} from "@/lib/products/experience-designer";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type DbRow = {
  id: string;
  slug: string | null;
  name: string;
  name_ar: string;
  description: string | null;
  description_ar: string | null;
  config: unknown;
  is_system: boolean;
  sort_order: number;
};

function mapRow(row: DbRow): ExperienceTemplateRow {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name || "",
    name_ar: row.name_ar || row.name || "",
    description: row.description ?? "",
    description_ar: row.description_ar ?? "",
    config: normalizeProductExperienceConfig(row.config),
    is_system: Boolean(row.is_system),
    sort_order: Number(row.sort_order) || 0,
  };
}

export async function listExperienceTemplates(): Promise<ExperienceTemplateRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("product_experience_templates")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      if (/product_experience_templates|PGRST205|42P01/i.test(error.message ?? "")) {
        return [];
      }
      console.error("[experience-templates] list", error.message);
      return [];
    }
    return ((data ?? []) as DbRow[]).map(mapRow);
  } catch {
    return [];
  }
}

export async function getExperienceTemplate(
  id: string
): Promise<ExperienceTemplateRow | null> {
  if (!isSupabaseConfigured() || !id) return null;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("product_experience_templates")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return mapRow(data as DbRow);
  } catch {
    return null;
  }
}

export async function saveExperienceTemplate(input: {
  id?: string;
  slug?: string | null;
  name: string;
  name_ar: string;
  description?: string;
  description_ar?: string;
  config: ProductExperienceConfig;
  is_system?: boolean;
  sort_order?: number;
}): Promise<ExperienceTemplateRow | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createAdminClient();
  const payload = {
    slug: input.slug ?? null,
    name: input.name.trim(),
    name_ar: input.name_ar.trim() || input.name.trim(),
    description: input.description ?? "",
    description_ar: input.description_ar ?? "",
    config: normalizeProductExperienceConfig(input.config),
    is_system: Boolean(input.is_system),
    sort_order: input.sort_order ?? 0,
    updated_at: new Date().toISOString(),
  };
  if (input.id) {
    const { data, error } = await supabase
      .from("product_experience_templates")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .maybeSingle();
    if (error || !data) {
      console.error("[experience-templates] update", error?.message);
      return null;
    }
    return mapRow(data as DbRow);
  }
  const { data, error } = await supabase
    .from("product_experience_templates")
    .insert(payload)
    .select("*")
    .maybeSingle();
  if (error || !data) {
    console.error("[experience-templates] insert", error?.message);
    return null;
  }
  return mapRow(data as DbRow);
}

export async function deleteExperienceTemplate(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !id) return false;
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("product_experience_templates")
      .delete()
      .eq("id", id)
      .eq("is_system", false);
    return !error;
  } catch {
    return false;
  }
}
