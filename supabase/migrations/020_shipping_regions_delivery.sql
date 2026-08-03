-- Milestone 9: shipping regions + boutique pickup / delivery
-- Safe to re-run (idempotent).

-- ---------------------------------------------------------------------------
-- shipping_regions catalog
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shipping_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL DEFAULT '',
  shipping_fee NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  estimated_days INT,
  carrier_code TEXT,
  free_shipping_override NUMERIC,
  discount NUMERIC,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipping_regions_active
  ON shipping_regions(is_active);
CREATE INDEX IF NOT EXISTS idx_shipping_regions_sort
  ON shipping_regions(sort_order);

ALTER TABLE shipping_regions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active shipping_regions" ON shipping_regions;
CREATE POLICY "Public read active shipping_regions" ON shipping_regions
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admin all shipping_regions" ON shipping_regions;
CREATE POLICY "Admin all shipping_regions" ON shipping_regions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Seed Saudi regions (stable UUIDs for idempotent upserts)
INSERT INTO shipping_regions (id, name_ar, name_en, shipping_fee, is_active, sort_order)
VALUES
  ('b1000000-0000-4000-8000-000000000001', 'الرياض', 'Riyadh', 35, true, 10),
  ('b1000000-0000-4000-8000-000000000002', 'جدة', 'Jeddah', 40, true, 20),
  ('b1000000-0000-4000-8000-000000000003', 'الدمام', 'Dammam', 45, true, 30),
  ('b1000000-0000-4000-8000-000000000004', 'مكة', 'Makkah', 40, true, 40),
  ('b1000000-0000-4000-8000-000000000005', 'المدينة', 'Madinah', 45, true, 50),
  ('b1000000-0000-4000-8000-000000000006', 'القصيم', 'Qassim', 50, true, 60),
  ('b1000000-0000-4000-8000-000000000007', 'تبوك', 'Tabuk', 55, true, 70),
  ('b1000000-0000-4000-8000-000000000008', 'أبها', 'Abha', 55, true, 80),
  ('b1000000-0000-4000-8000-000000000009', 'حائل', 'Hail', 55, true, 90),
  ('b1000000-0000-4000-8000-000000000010', 'الطائف', 'Taif', 45, true, 100),
  ('b1000000-0000-4000-8000-000000000011', 'أخرى', 'Other', 60, true, 110)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- shop_orders: delivery method + extended address
-- ---------------------------------------------------------------------------
ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS delivery_method TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_region_id UUID REFERENCES shipping_regions(id) ON DELETE SET NULL;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_region_name_ar TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_building_number TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_neighborhood TEXT;

-- Constrain delivery_method when set (NULL allowed for legacy / dress-only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shop_orders_delivery_method_check'
  ) THEN
    ALTER TABLE shop_orders
      ADD CONSTRAINT shop_orders_delivery_method_check
      CHECK (delivery_method IS NULL OR delivery_method IN ('pickup', 'delivery'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_shop_orders_delivery_method
  ON shop_orders(delivery_method);
CREATE INDEX IF NOT EXISTS idx_shop_orders_shipping_region_id
  ON shop_orders(shipping_region_id);

COMMENT ON COLUMN shop_orders.delivery_method IS
  'pickup = boutique pickup; delivery = courier. NULL on legacy / non-shipping orders.';
COMMENT ON COLUMN shop_orders.shipping_region_id IS
  'FK to shipping_regions when delivery_method = delivery.';
COMMENT ON COLUMN shop_orders.shipping_region_name_ar IS
  'Denormalized Arabic region name snapshot at checkout.';
