import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

function loadEnv(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i <= 0) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

const env = loadEnv(".env.local");
const url = env.NEXT_PUBLIC_SUPABASE_URL || "";
const key =
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";
const cloud = env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const preset = env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";
const hasService = Boolean(env.SUPABASE_SERVICE_ROLE_KEY);

console.log(
  JSON.stringify(
    {
      supabaseConfigured: Boolean(url && key),
      supabaseHost: url ? new URL(url).host : null,
      hasServiceRole: hasService,
      cloudinaryConfigured: Boolean(cloud && preset),
      cloudName: cloud || null,
      uploadPreset: preset || null,
    },
    null,
    2
  )
);

if (!url || !key) {
  console.log("SKIP_SUPABASE");
} else {
  const sb = createClient(url, key);
  for (const table of [
    "dresses",
    "bookings",
    "veils",
    "bridal_robes",
    "shop_orders",
  ]) {
    const { error } = await sb.from(table).select("id").limit(1);
    console.log(
      `TABLE ${table}:`,
      error ? `${error.code || "ERR"} ${error.message}` : "OK"
    );
  }

  const payload = {
    name: "اختبار تشخيص",
    phone: "0599000000",
    email: null,
    notes: "debug-probe",
    gift_options: null,
    total: 100,
    items: [
      {
        product_type: "veil",
        product_id: "probe",
        name_ar: "طرحة",
        unit_price: 100,
        quantity: 1,
        image: null,
        personalization: null,
      },
    ],
    status: "pending",
  };
  const { data, error } = await sb
    .from("shop_orders")
    .insert(payload)
    .select("id")
    .single();
  if (error) {
    console.log("INSERT_FAIL", error.code, error.message);
  } else {
    console.log("INSERT_OK", data?.id);
    await sb.from("shop_orders").delete().eq("id", data.id);
    console.log("CLEANUP_ATTEMPTED");
  }
}

if (!cloud || !preset) {
  console.log("SKIP_CLOUDINARY");
  process.exit(0);
}

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
const form = new FormData();
form.append("file", new Blob([png], { type: "image/png" }), "probe.png");
form.append("upload_preset", preset);
form.append("folder", env.NEXT_PUBLIC_CLOUDINARY_FOLDER || "nadeendesigns");
const cres = await fetch(
  `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
  { method: "POST", body: form }
);
const cjson = await cres.json();
if (!cres.ok) {
  console.log("CLOUDINARY_FAIL", cres.status, cjson?.error?.message || cjson);
} else {
  console.log(
    "CLOUDINARY_OK",
    Boolean(cjson.secure_url),
    String(cjson.secure_url || "").slice(0, 72)
  );
}
