/**
 * P1.1 QA — Product Edit category selector (read-only API + code-path checks)
 */
import fs from "fs";

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

function isDressAssignable(row) {
  const kind = row.product_kind ?? null;
  const effective =
    kind === "accessories_group" && row.parent_id ? "dress" : kind;
  return effective === "dress" || effective === null;
}

const evidence = {
  ts: new Date().toISOString(),
  base: BASE,
  categoryName: "سنسال",
  categoryId: null,
  apiContains: false,
  apiAssignable: false,
  apiKindEffective: null,
  codePaths: {},
  errors: [],
};

const modal = fs.readFileSync("src/components/admin/product-editor/ProductEditorModal.tsx", "utf8");
const manager = fs.readFileSync("src/components/admin/DressesManager.tsx", "utf8");
const helper = fs.readFileSync("src/lib/admin/fetch-admin-categories.ts", "utf8");
const norm = fs.readFileSync("src/lib/data/categories.ts", "utf8");

evidence.codePaths = {
  sharedHelper: helper.includes('fetch("/api/categories"') && helper.includes('cache: "no-store"'),
  modalFetchesOnOpen: modal.includes("fetchAdminCategories()") && modal.includes("[open, editing?.id]"),
  modalNoStaleProps: !modal.includes("dressCategories: Category[]"),
  createAndEditSameQuery:
    manager.includes("Same query as Edit") && manager.includes("Same query as Create"),
  noInitialCategoriesClobber: !manager.includes("categoriesProp"),
  leafAccessoriesCoerce: norm.includes("Leaf categories must not use accessories_group"),
};

const res = await fetch(`${BASE}/api/categories`, { cache: "no-store" });
evidence.apiStatus = res.status;
const list = await res.json();
const sinsal = Array.isArray(list) ? list.find((c) => c.name_ar === "سنسال") : null;
if (!sinsal) {
  evidence.errors.push("سنسال missing from /api/categories");
} else {
  evidence.categoryId = sinsal.id;
  evidence.apiContains = true;
  evidence.apiKindEffective = sinsal.product_kind;
  evidence.apiAssignable = isDressAssignable(sinsal);
  evidence.rawParentId = sinsal.parent_id;
  evidence.inAssignableNames = list
    .filter(isDressAssignable)
    .some((c) => c.name_ar === "سنسال");
}

evidence.pass =
  Object.values(evidence.codePaths).every(Boolean) &&
  evidence.apiContains &&
  evidence.apiAssignable &&
  evidence.inAssignableNames;

console.log(JSON.stringify(evidence, null, 2));
fs.mkdirSync("tmp", { recursive: true });
fs.writeFileSync("tmp/qa-p11-edit-category-result.json", JSON.stringify(evidence, null, 2));
process.exit(evidence.pass ? 0 : 1);
