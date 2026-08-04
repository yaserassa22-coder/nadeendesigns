/**
 * Verify Sprint 1.2 storefront rule: visible categories appear even if empty.
 * Usage: node --env-file=.env.local scripts/verify-storefront-categories.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await supabase
  .from("categories")
  .select("id, name_ar, slug, is_visible, product_kind, is_deleted, parent_id")
  .order("sort_order", { ascending: true });

if (error) {
  console.error(error);
  process.exit(1);
}

const active = (data ?? []).filter((c) => c.is_deleted !== true);
const visible = active.filter((c) => c.is_visible !== false);
const emptyKnown = visible.filter((c) =>
  ["new", "new-collection1", "custom-design"].includes(c.slug)
);

console.log(
  JSON.stringify(
    {
      active: active.length,
      visible: visible.length,
      visibleSlugs: visible.map((c) => c.slug),
      emptyVisibleThatMustAppear: emptyKnown.map((c) => c.slug),
      pass: emptyKnown.length >= 2,
    },
    null,
    2
  )
);
process.exit(emptyKnown.length >= 2 ? 0 : 1);
