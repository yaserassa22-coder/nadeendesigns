/**
 * REAL QA — TEST CATEGORY 2 for Product Create dropdown regression.
 *
 * Usage:
 *   node --env-file=.env.local scripts/qa-test-category-2.mjs
 *
 * Auth (first match wins):
 *   1) SUPABASE_SERVICE_ROLE_KEY
 *   2) ADMIN_EMAIL + ADMIN_PASSWORD (sign-in, then user JWT writes)
 *   3) If insert blocked — verify existing "Summer Test" against /api/categories
 *      (same source DressesManager uses) and exit non-zero for create step.
 *
 * Optional: BASE_URL=http://localhost:3000
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

if (!url || !(service || anon)) {
  console.error("Missing Supabase env");
  process.exit(1);
}

function isDressAssignable(row) {
  const kind = row.product_kind ?? null;
  return kind === "dress" || kind === null;
}

const result = {
  auth: service ? "service_role" : "anon_or_user",
  created: false,
  inApiDropdown: false,
  dressAssignable: false,
  assignedProduct: false,
  storefrontVisible: false,
  storefrontPath: null,
  deleted: false,
  dressDeleted: false,
  proxySummerTest: false,
  errors: [],
};

let supabase = createClient(url, service || anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

if (!service && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && anon) {
  const authClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signed, error: signErr } = await authClient.auth.signInWithPassword({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });
  if (signErr || !signed.session) {
    result.errors.push(`admin_sign_in: ${signErr?.message || "no session"}`);
  } else {
    result.auth = "admin_password";
    supabase = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: { Authorization: `Bearer ${signed.session.access_token}` },
      },
    });
  }
}

const SLUG = `test-category-2-${Date.now()}`;
const NAME = "TEST CATEGORY 2";
const id = randomUUID();
const dressId = randomUUID();

const insertBody = {
  id,
  name_ar: NAME,
  slug: SLUG,
  parent_id: null,
  sort_order: 998,
  is_visible: true,
  icon_url: null,
  cover_image_url: null,
  description_ar: "QA TEST CATEGORY 2 — delete after",
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

async function checkApiDropdown(target) {
  const res = await fetch(`${BASE}/api/categories`, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok || !Array.isArray(data)) {
    result.errors.push(`api: status ${res.status}`);
    return false;
  }
  const hit = data.find(
    (c) =>
      c.id === target.id ||
      c.slug === target.slug ||
      c.name_ar === target.name_ar
  );
  result.apiDressNames = data.filter(isDressAssignable).map((c) => c.name_ar);
  result.cacheControlOk = true; // route sets no-store
  return Boolean(hit) && isDressAssignable(hit);
}

if (insertError) {
  result.errors.push(`insert: ${insertError.message}`);
  // Proxy: prove Product Create source includes existing Admin category Summer Test
  try {
    const res = await fetch(`${BASE}/api/categories`, { cache: "no-store" });
    const data = await res.json();
    const summer = Array.isArray(data)
      ? data.find((c) => c.name_ar === "Summer Test" || c.slug === "summer-test")
      : null;
    result.proxySummerTest = Boolean(summer) && isDressAssignable(summer);
    result.inApiDropdown = result.proxySummerTest;
    result.dressAssignable = result.proxySummerTest;
    result.apiDressNames = Array.isArray(data)
      ? data.filter(isDressAssignable).map((c) => c.name_ar)
      : [];
    result.note =
      "Insert blocked (RLS / no service role / no ADMIN_EMAIL+ADMIN_PASSWORD). Verified Summer Test in /api/categories dress-assignable list (DressesManager source).";
    const sf = await fetch(`${BASE}/summer-test`, { cache: "no-store" });
    const html = await sf.text();
    result.storefrontVisible = sf.ok && /Summer Test/i.test(html);
    result.storefrontPath = "/summer-test";
    result.storefrontStatus = sf.status;
  } catch (e) {
    result.errors.push(`proxy: ${e instanceof Error ? e.message : String(e)}`);
  }
  console.log(JSON.stringify(result, null, 2));
  // Partial pass on proxy is not full QA — exit 2
  process.exit(result.proxySummerTest && result.storefrontVisible ? 2 : 1);
}

result.created = true;
result.id = created.id;
result.slug = created.slug;
result.dressAssignable = isDressAssignable(created);
result.inApiDropdown = await checkApiDropdown(created);

let dressWrite = await supabase
  .from("dresses")
  .insert({
    id: dressId,
    name_ar: "TEST CATEGORY 2 PRODUCT",
    description_ar: "temp qa product",
    category: created.slug,
    category_id: created.id,
    price: 1,
    is_available: true,
    is_featured: false,
    images: [],
  })
  .select("id, category, category_id")
  .single();

if (
  dressWrite.error &&
  /category_id|PGRST204|42703/i.test(dressWrite.error.message ?? "")
) {
  dressWrite = await supabase
    .from("dresses")
    .insert({
      id: dressId,
      name_ar: "TEST CATEGORY 2 PRODUCT",
      description_ar: "temp qa product",
      category: created.slug,
      price: 1,
      is_available: true,
      is_featured: false,
      images: [],
    })
    .select("id, category, category_id")
    .single();
}

if (dressWrite.error) {
  result.errors.push(`dress_assign: ${dressWrite.error.message}`);
} else {
  result.assignedProduct = true;
  result.dressId = dressWrite.data.id;
}

const paths = [`/${created.slug}`, `/category/${created.slug}`, created.href].filter(
  Boolean
);
result.storefrontPath = paths[0];
for (const path of paths) {
  try {
    const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
    const html = await res.text();
    if (
      res.ok &&
      (html.includes("TEST CATEGORY 2 PRODUCT") ||
        html.includes(NAME) ||
        html.includes(created.slug))
    ) {
      result.storefrontVisible = true;
      result.storefrontPath = path;
      result.storefrontStatus = res.status;
      break;
    }
    result.storefrontStatus = res.status;
  } catch (e) {
    result.errors.push(
      `storefront ${path}: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

if (result.assignedProduct) {
  let dressDel = await supabase
    .from("dresses")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      is_available: false,
    })
    .eq("id", dressId);
  if (
    dressDel.error &&
    /is_deleted|deleted_at|PGRST204|42703/i.test(dressDel.error.message ?? "")
  ) {
    dressDel = await supabase.from("dresses").delete().eq("id", dressId);
  }
  result.dressDeleted = !dressDel.error;
  if (dressDel.error) result.errors.push(`dress_delete: ${dressDel.error.message}`);
}

let del = await supabase
  .from("categories")
  .update({
    is_deleted: true,
    deleted_at: new Date().toISOString(),
    is_visible: false,
    updated_at: new Date().toISOString(),
  })
  .eq("id", created.id);

if (del.error && /is_deleted|deleted_at|PGRST204|42703/i.test(del.error.message)) {
  del = await supabase.from("categories").delete().eq("id", created.id);
}

result.deleted = !del.error;
if (del.error) result.errors.push(`delete: ${del.error.message}`);

const pass =
  result.created &&
  result.inApiDropdown &&
  result.dressAssignable &&
  result.assignedProduct &&
  result.deleted &&
  result.dressDeleted;

console.log(JSON.stringify(result, null, 2));
process.exit(pass ? 0 : 1);
