-- Shop order shipping (bridal accessories only)
-- Safe to re-run. Existing rows keep NULL shipping fields.

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_required BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_full_name TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_phone TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_city TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_region TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_address TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_postal_code TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_notes TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC NOT NULL DEFAULT 0;

COMMENT ON COLUMN shop_orders.shipping_required IS
  'True when order includes bridal accessories that need delivery';
COMMENT ON COLUMN shop_orders.shipping_cost IS
  'Flat shipping fee from site settings at checkout time';
