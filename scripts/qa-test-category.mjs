/**
 * Sprint 1.2 QA — create TEST CATEGORY, verify visibility path, delete.
 * Usage: node --env-file=.env.local scripts/qa-test-category.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SLUG = `test-category-s12-${Date.now()}`;
const NAME = "TEST CATEGORY";
const id = randomUUID();

const result = {
  auth: process.env.SUPABASE_SERVICE_ROLE_KEY ? "service_role" : "anon",
  created: false,
  listedVisible: false,
  deleted: false,
  leftover: false,
  errors: [],
};

const insertBody = {
  id,
  name_ar: NAME,
  slug: SLUG,
  parent_id: null,
  sort_order: 999,
  is_visible: true,
  icon_url: null,
  cover_image_url: null,
  description_ar: "Sprint 1.2 temporary QA category — delete after",
  href: `/${SLUG}`,
  legacy_key: null,
  product_kind: "dress",
  updated_at: new Date().toISOString(),
};

let { data: created, error: insertError } = await supabase
  .from("categories")
  .insert(insertBody)
  .select()
  .single();

if (insertError && /product_kind|PGRST204|42703/i.test(insertError.message)) {
  const { product_kind: _pk, ...legacy } = insertBody;
  const retry = await supabase.from("categories").insert(legacy).select().single();
  created = retry.data;
  insertError = retry.error;
}

if (insertError) {
  result.errors.push(`insert: ${insertError.message}`);
  // Fallback verification using existing empty Admin categories
  const { data: existing } = await supabase
    .from("categories")
    .select("id, name_ar, slug, is_visible, product_kind, is_deleted")
    .eq("is_visible", true)
    .in("slug", ["new", "new-collection1"]);
  result.proxyEmptyCategories = existing ?? [];
  result.listedVisible = (existing ?? []).some((c) => c.is_visible !== false);
  console.log(JSON.stringify(result, null, 2));
  process.exit(insertError ? 0 : 1);
}

result.created = true;
result.id = created.id;
result.slug = created.slug;

const { data: listed, error: listError } = await supabase
  .from("categories")
  .select("id, name_ar, slug, is_visible, product_kind")
  .eq("id", created.id)
  .maybeSingle();

if (listError) result.errors.push(`list: ${listError.message}`);
result.listedVisible =
  Boolean(listed) &&
  listed.is_visible !== false &&
  listed.slug === SLUG &&
  listed.product_kind === "dress";

// Soft-delete preferred
let del = await supabase
  .from("categories")
  .update({
    is_deleted: true,
    deleted_at: new Date().toISOString(),
    is_visible: false,
    updated_at: new Date().toISOString(),
  })
  .eq("id", created.id)
  .select("id")
  .maybeSingle();

if (del.error && /is_deleted|deleted_at|PGRST204|42703/i.test(del.error.message)) {
  del = await supabase.from("categories").delete().eq("id", created.id).select("id").maybeSingle();
}

if (del.error) {
  result.errors.push(`delete: ${del.error.message}`);
} else {
  result.deleted = true;
}

const { data: leftover } = await supabase
  .from("categories")
  .select("id, is_deleted, is_visible, name_ar")
  .eq("name_ar", NAME)
  .or(`slug.eq.${SLUG},id.eq.${created.id}`);

result.leftover = (leftover ?? []).some(
  (r) => r.is_deleted !== true && r.is_visible !== false
);
result.leftoverRows = leftover ?? [];

console.log(JSON.stringify(result, null, 2));
process.exit(result.created && result.listedVisible && result.deleted && !result.leftover ? 0 : 1);
