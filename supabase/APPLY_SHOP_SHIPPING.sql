-- Apply in Supabase SQL Editor if migration runner is not used.
-- Same as migrations/017_shop_order_shipping.sql

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

DROP POLICY IF EXISTS "Public read shop_orders by id" ON shop_orders;
CREATE POLICY "Public read shop_orders by id" ON shop_orders
  FOR SELECT USING (true);
