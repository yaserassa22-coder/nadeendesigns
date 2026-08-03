/**
 * Rename برنس → برنص in live Supabase rows (anon can read public tables;
 * writes require SUPABASE_SERVICE_ROLE_KEY).
 */
import { readFileSync, writeFileSync } from "fs";

function loadEnv() {
  const env = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[line.slice(0, i).trim()] = v;
  }
  return env;
}

const BAD = "برنس";
const GOOD = "برنص";
const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
const anon =
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const key = service || anon;

async function rest(path, { method = "GET", body } = {}) {
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    headers.Prefer = "return=representation";
  }
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

function replaceDeep(value) {
  if (typeof value === "string") return value.split(BAD).join(GOOD);
  if (Array.isArray(value)) return value.map(replaceDeep);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = replaceDeep(v);
    return out;
  }
  return value;
}

function containsBad(value) {
  return JSON.stringify(value ?? null).includes(BAD);
}

const report = { hasService: Boolean(service), scanned: {}, updated: {}, errors: [] };

async function patchTable(table, select, buildPatch) {
  const list = await rest(`${table}?select=${select}`);
  const rows = Array.isArray(list.data) ? list.data : [];
  const bad = rows.filter((r) => containsBad(r));
  report.scanned[table] = {
    ok: list.ok,
    status: list.status,
    total: rows.length,
    withBad: bad.length,
    samples: bad.slice(0, 5).map((r) => ({
      id: r.id,
      name_ar: r.name_ar,
      title_ar: r.title_ar,
    })),
  };
  if (!service) return;
  let n = 0;
  for (const row of bad) {
    const res = await rest(`${table}?id=eq.${row.id}`, {
      method: "PATCH",
      body: buildPatch(row),
    });
    if (!res.ok) report.errors.push({ table, id: row.id, res });
    else n += 1;
  }
  report.updated[table] = n;
}

await patchTable(
  "bridal_robes",
  "id,name_ar,description_ar,color,material,size",
  (row) => ({
    name_ar: replaceDeep(row.name_ar),
    description_ar: replaceDeep(row.description_ar),
    color: replaceDeep(row.color),
    material: replaceDeep(row.material),
    size: replaceDeep(row.size),
    updated_at: new Date().toISOString(),
  })
);

await patchTable("categories", "id,name_ar,description_ar", (row) => ({
  name_ar: replaceDeep(row.name_ar),
  description_ar: replaceDeep(row.description_ar),
  updated_at: new Date().toISOString(),
}));

await patchTable("dresses", "id,name_ar,description_ar", (row) => ({
  name_ar: replaceDeep(row.name_ar),
  description_ar: replaceDeep(row.description_ar),
  updated_at: new Date().toISOString(),
}));

await patchTable("veils", "id,name_ar,description_ar", (row) => ({
  name_ar: replaceDeep(row.name_ar),
  description_ar: replaceDeep(row.description_ar),
  updated_at: new Date().toISOString(),
}));

await patchTable("gallery_items", "id,title_ar,category", (row) => ({
  title_ar: replaceDeep(row.title_ar),
  category: replaceDeep(row.category),
}));

await patchTable("shop_orders", "id,items,notes", (row) => ({
  items: replaceDeep(row.items),
  notes: replaceDeep(row.notes),
}));

await patchTable(
  "bookings",
  "id,notes,personalization,gift_options",
  (row) => ({
    notes: replaceDeep(row.notes),
    personalization: replaceDeep(row.personalization),
    gift_options: replaceDeep(row.gift_options),
  })
);

writeFileSync(
  "tmp-rename-to-bernus-report.json",
  JSON.stringify(report, null, 2),
  "utf8"
);
console.log(JSON.stringify(report, null, 2));
