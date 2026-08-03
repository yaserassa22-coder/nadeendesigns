/** Smoke: delivery slip visibility + schema-error detection (no DB). */

function isMissingColumnError(error) {
  const code = error?.code ?? "";
  const raw = error?.message ?? "";
  return (
    code === "42703" ||
    code === "PGRST204" ||
    /column .* does not exist/i.test(raw) ||
    /Could not find the .*column/i.test(raw)
  );
}

function isOrderSchemaError(error) {
  return isMissingColumnError(error);
}

function isShippingRegionFkError(error) {
  const code = error?.code ?? "";
  const raw = error?.message ?? "";
  if (code === "23503") return /shipping_region_id/i.test(raw);
  return /foreign key/i.test(raw) && /shipping_region_id/i.test(raw);
}

function hasCourierAddress(order) {
  return Boolean(
    order.shipping_address ||
      order.shipping_full_name ||
      order.shipping_city ||
      order.shipping_region ||
      order.shipping_region_name_ar ||
      order.shipping_region_custom
  );
}

function orderShowsShippingSection(order) {
  if (order.delivery_method === "delivery") return true;
  if (order.delivery_method === "pickup") return true;
  if (order.shipping_required) return true;
  if (order.shipping_fee_pending) return true;
  return hasCourierAddress(order);
}

function isDeliveryOrderForSlip(order) {
  if (order.delivery_method === "pickup") return false;
  if (order.delivery_method === "delivery") return true;
  if (order.shipping_required === false) return false;
  if (order.shipping_fee_pending) return true;
  return hasCourierAddress(order);
}

function passesAdminDefaultFilter(o) {
  // methodFilter/regionFilter/status all "all"
  return true;
}

const slipCases = [
  [{ delivery_method: "delivery" }, true],
  [{ delivery_method: "delivery", shipping_required: false }, true],
  [{ delivery_method: "pickup" }, false],
  [{ delivery_method: "pickup", shipping_required: true }, false],
  [{ shipping_required: true, shipping_address: "x" }, true],
  [{ delivery_method: "delivery", shipping_fee_pending: true }, true],
  [{ shipping_required: false }, false],
  [{ shipping_fee_pending: true, shipping_region_custom: "قرية" }, true],
  [{}, false],
];

let ok = true;
for (const [o, exp] of slipCases) {
  const got = isDeliveryOrderForSlip(o);
  if (got !== exp) {
    console.error("FAIL slip", o, "got", got, "exp", exp);
    ok = false;
  }
}

const sectionCases = [
  [{ delivery_method: "delivery" }, true],
  [{ delivery_method: "delivery", shipping_required: false }, true],
  [{ delivery_method: "pickup" }, true],
  [{ shipping_required: false }, false],
  [{ shipping_address: "x" }, true],
];
for (const [o, exp] of sectionCases) {
  const got = orderShowsShippingSection(o);
  if (got !== exp) {
    console.error("FAIL section", o, "got", got, "exp", exp);
    ok = false;
  }
  // Never show dress-only message for delivery
  if (o.delivery_method === "delivery" && !got) {
    console.error("FAIL delivery treated as non-shipping", o);
    ok = false;
  }
}

const samples = [
  { delivery_method: "pickup" },
  { delivery_method: "delivery", shipping_fee_pending: true },
  { shipping_region_custom: "قرية", shipping_fee_pending: true },
  { delivery_method: null, shipping_required: null },
];
for (const o of samples) {
  if (!passesAdminDefaultFilter(o)) {
    console.error("FAIL filter hid", o);
    ok = false;
  }
}

const missingCol = {
  code: "PGRST204",
  message:
    "Could not find the 'shipping_fee_pending' column of 'shop_orders' in the schema cache",
};
if (!isOrderSchemaError(missingCol)) {
  console.error("FAIL schema err missing column");
  ok = false;
}

// FK errors must NOT trigger progressive column stripping
const fkErr = {
  code: "23503",
  message:
    'insert or update on table "shop_orders" violates foreign key constraint "shop_orders_shipping_region_id_fkey"',
};
if (isOrderSchemaError(fkErr)) {
  console.error("FAIL FK treated as schema/missing-column error");
  ok = false;
}
if (!isShippingRegionFkError(fkErr)) {
  console.error("FAIL FK not detected as shipping_region_id FK");
  ok = false;
}

console.log(ok ? "SMOKE_OK" : "SMOKE_FAIL");
process.exit(ok ? 0 : 1);
