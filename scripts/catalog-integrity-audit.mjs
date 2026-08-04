/**
 * Sprint 1.2 — catalog + category integrity audit (read-only).
 * Usage: node --env-file=.env.local scripts/catalog-integrity-audit.mjs
 */
import { createClient } from "@supabase/supabase-js";

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

const findings = {
  missingProducts: [],
  wrongCategoryAssignments: [],
  missingImages: [],
  brokenLinks: [],
  duplicateSlugs: [],
  emptyCategories: [],
  orphanedProducts: [],
  sqlInconsistencies: [],
  notes: [],
};

function isActive(row) {
  if (row.is_deleted === true) return false;
  if (row.archived_at) return false;
  return true;
}

async function selectAll(table, columns = "*") {
  const { data, error } = await supabase.from(table).select(columns);
  if (error) {
    findings.sqlInconsistencies.push(`${table}: ${error.message}`);
    return [];
  }
  return data ?? [];
}

const categories = await selectAll("categories");
const dresses = await selectAll("dresses");
const veils = await selectAll("veils");
const robes = await selectAll("bridal_robes");

const activeCats = categories.filter(isActive);
const visibleCats = activeCats.filter((c) => c.is_visible !== false);
const catById = new Map(activeCats.map((c) => [c.id, c]));

// Duplicate slugs
const slugMap = new Map();
for (const c of activeCats) {
  const slug = (c.slug || "").trim().toLowerCase();
  if (!slug) {
    findings.sqlInconsistencies.push(`Category ${c.id} missing slug`);
    continue;
  }
  if (!slugMap.has(slug)) slugMap.set(slug, []);
  slugMap.get(slug).push(c);
}
for (const [slug, rows] of slugMap) {
  if (rows.length > 1) {
    findings.duplicateSlugs.push({
      slug,
      ids: rows.map((r) => r.id),
      names: rows.map((r) => r.name_ar),
    });
  }
}

const activeDresses = dresses.filter(isActive);
const activeVeils = veils.filter(isActive);
const activeRobes = robes.filter(isActive);

// Orphaned dresses + wrong category + missing images
for (const d of activeDresses) {
  const images = Array.isArray(d.images) ? d.images : [];
  if (!images.length) {
    findings.missingImages.push({
      kind: "dress",
      id: d.id,
      name: d.name_ar,
      category: d.category,
      category_id: d.category_id,
    });
  }
  if (d.price == null && d.rental_price == null) {
    findings.sqlInconsistencies.push(
      `Dress ${d.id} (${d.name_ar}) has no price/rental_price`
    );
  }
  if (d.category_id) {
    const cat = catById.get(d.category_id);
    if (!cat) {
      findings.orphanedProducts.push({
        kind: "dress",
        id: d.id,
        name: d.name_ar,
        reason: "category_id not found in active categories",
        category_id: d.category_id,
        category: d.category,
      });
    } else {
      const text = (d.category || "").trim().toLowerCase();
      const keys = [cat.legacy_key, cat.slug]
        .filter(Boolean)
        .map((k) => k.toLowerCase());
      const aliases = {
        wedding: ["wedding", "wedding_dress"],
        nouf_dresses: ["nouf_dresses", "nouf_dress"],
      };
      const ok =
        !text ||
        keys.includes(text) ||
        (cat.legacy_key &&
          (aliases[cat.legacy_key] || []).includes(text));
      if (!ok) {
        findings.wrongCategoryAssignments.push({
          kind: "dress",
          id: d.id,
          name: d.name_ar,
          category_id: d.category_id,
          category_text: d.category,
          category_name: cat.name_ar,
          expected_keys: keys,
        });
      }
    }
  } else if (d.category) {
    const match = activeCats.find(
      (c) =>
        c.legacy_key?.toLowerCase() === d.category.toLowerCase() ||
        c.slug?.toLowerCase() === d.category.toLowerCase() ||
        (d.category === "wedding_dress" && c.legacy_key === "wedding") ||
        (d.category === "nouf_dress" && c.legacy_key === "nouf_dresses")
    );
    if (!match) {
      findings.orphanedProducts.push({
        kind: "dress",
        id: d.id,
        name: d.name_ar,
        reason: "TEXT category unmatched and no category_id",
        category: d.category,
      });
    } else {
      findings.sqlInconsistencies.push(
        `Dress ${d.id} (${d.name_ar}) missing category_id; TEXT="${d.category}" → ${match.name_ar}`
      );
    }
  } else {
    findings.orphanedProducts.push({
      kind: "dress",
      id: d.id,
      name: d.name_ar,
      reason: "no category_id and no category TEXT",
    });
  }
}

for (const v of activeVeils) {
  const images = Array.isArray(v.images) ? v.images : [];
  if (!images.length) {
    findings.missingImages.push({
      kind: "veil",
      id: v.id,
      name: v.name_ar,
    });
  }
}
for (const r of activeRobes) {
  const images = Array.isArray(r.images) ? r.images : [];
  if (!images.length) {
    findings.missingImages.push({
      kind: "bridal_robe",
      id: r.id,
      name: r.name_ar,
    });
  }
}

// Empty visible categories (dress leaves)
const dressCounts = new Map();
for (const d of activeDresses) {
  if (d.category_id) {
    dressCounts.set(d.category_id, (dressCounts.get(d.category_id) || 0) + 1);
  }
}

for (const c of visibleCats) {
  const kind = c.product_kind;
  if (kind === "accessories_group") continue;
  if (kind === "veil") {
    if (activeVeils.length === 0) {
      findings.emptyCategories.push({
        id: c.id,
        name: c.name_ar,
        slug: c.slug,
        kind,
      });
    }
    continue;
  }
  if (kind === "bridal_robe") {
    if (activeRobes.length === 0) {
      findings.emptyCategories.push({
        id: c.id,
        name: c.name_ar,
        slug: c.slug,
        kind,
      });
    }
    continue;
  }
  // dress / null
  const byId = dressCounts.get(c.id) || 0;
  const byText = activeDresses.filter((d) => {
    const t = (d.category || "").toLowerCase();
    return (
      t === (c.legacy_key || "").toLowerCase() ||
      t === (c.slug || "").toLowerCase()
    );
  }).length;
  if (byId + byText === 0) {
    findings.emptyCategories.push({
      id: c.id,
      name: c.name_ar,
      slug: c.slug,
      kind: kind || "dress?",
    });
  }

  // Broken link risk: no slug
  if (!c.slug?.trim() && !c.href?.trim()) {
    findings.brokenLinks.push({
      id: c.id,
      name: c.name_ar,
      reason: "no slug/href",
    });
  }
}

// Published available dresses without storefront path signals
const availableDresses = activeDresses.filter((d) => d.is_available !== false);
findings.notes.push(
  `counts: categories=${activeCats.length} visible=${visibleCats.length} dresses=${activeDresses.length} available=${availableDresses.length} veils=${activeVeils.length} robes=${activeRobes.length}`
);
findings.notes.push(
  `auth: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? "service_role" : "anon"}`
);

const summary = {
  categories: visibleCats.map((c) => ({
    id: c.id,
    name_ar: c.name_ar,
    slug: c.slug,
    href: c.href,
    legacy_key: c.legacy_key,
    product_kind: c.product_kind,
    is_visible: c.is_visible,
    parent_id: c.parent_id,
  })),
  dressSample: availableDresses.slice(0, 40).map((d) => ({
    id: d.id,
    name_ar: d.name_ar,
    category: d.category,
    category_id: d.category_id,
    price: d.price,
    rental_price: d.rental_price,
    is_available: d.is_available,
    is_featured: d.is_featured,
    images: (d.images || []).length,
  })),
  veilSample: activeVeils.slice(0, 20).map((v) => ({
    id: v.id,
    name_ar: v.name_ar,
    price: v.price,
    is_available: v.is_available,
    images: (v.images || []).length,
  })),
  robeSample: activeRobes.slice(0, 20).map((r) => ({
    id: r.id,
    name_ar: r.name_ar,
    price: r.price,
    is_available: r.is_available,
    images: (r.images || []).length,
  })),
  findings,
};

console.log(JSON.stringify(summary, null, 2));
