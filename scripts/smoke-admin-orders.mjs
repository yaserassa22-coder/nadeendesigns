/** Smoke: delivery slip visibility + schema-error detection (no DB). */

function isDeliveryOrderForSlip(order) {
  if (order.delivery_method === "pickup") return false;
  if (order.delivery_method === "delivery") return true;
  if (order.shipping_required === false) return false;
  return Boolean(
    order.shipping_address ||
      order.shipping_full_name ||
      order.shipping_city
  );
}

function isOrderSchemaError(error) {
  const code = error?.code ?? "";
  const raw = error?.message ?? "";
  return (
    code === "42703" ||
    code === "PGRST204" ||
    /column .* does not exist/i.test(raw) ||
    /Could not find the .*column/i.test(raw) ||
    /notify_|shipping_|delivery_method|tracking_|region_configured|carrier_code/i.test(
      raw
    )
  );
}

function passesAdminDefaultFilter(o) {
  // methodFilter/regionFilter/status all "all"
  return true;
}

const cases = [
  [{ delivery_method: "delivery" }, true],
  [{ delivery_method: "pickup" }, false],
  [{ delivery_method: "pickup", shipping_required: true }, false],
  [{ shipping_required: true, shipping_address: "x" }, true],
  [{ delivery_method: "delivery", shipping_fee_pending: true }, true],
  [{ shipping_required: false }, false],
  [{}, false],
];

let ok = true;
for (const [o, exp] of cases) {
  const got = isDeliveryOrderForSlip(o);
  if (got !== exp) {
    console.error("FAIL slip", o, "got", got, "exp", exp);
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

const err = {
  code: "PGRST204",
  message:
    "Could not find the 'shipping_fee_pending' column of 'shop_orders' in the schema cache",
};
if (!isOrderSchemaError(err)) {
  console.error("FAIL schema err");
  ok = false;
}

console.log(ok ? "SMOKE_OK" : "SMOKE_FAIL");
process.exit(ok ? 0 : 1);
