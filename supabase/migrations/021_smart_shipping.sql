-- Milestone 10: smart region autocomplete, unknown regions, pending fees
-- Safe to re-run (idempotent). Self-contained: creates shipping_regions if missing.
-- Prefer APPLY_SHIPPING_REGIONS.sql (020) first for seeds + M9 order columns.
-- Editor copy: APPLY_SMART_SHIPPING.sql

-- ---------------------------------------------------------------------------
-- Ensure shipping_regions exists (from M9 / 020)
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

-- ---------------------------------------------------------------------------
-- shipping_regions: estimated delivery window + search indexes
-- ---------------------------------------------------------------------------
ALTER TABLE shipping_regions
  ADD COLUMN IF NOT EXISTS estimated_days_min INT;

ALTER TABLE shipping_regions
  ADD COLUMN IF NOT EXISTS estimated_days_max INT;

ALTER TABLE shipping_regions
  ADD COLUMN IF NOT EXISTS estimated_delivery_ar TEXT;

UPDATE shipping_regions
SET
  estimated_days_min = COALESCE(estimated_days_min, estimated_days),
  estimated_days_max = COALESCE(estimated_days_max, estimated_days)
WHERE estimated_days IS NOT NULL
  AND (estimated_days_min IS NULL OR estimated_days_max IS NULL);

ALTER TABLE shipping_regions
  ADD COLUMN IF NOT EXISTS meta JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_shipping_regions_name_ar
  ON shipping_regions (name_ar);

CREATE INDEX IF NOT EXISTS idx_shipping_regions_name_en
  ON shipping_regions (name_en);

CREATE INDEX IF NOT EXISTS idx_shipping_regions_active_sort
  ON shipping_regions (is_active, sort_order);

-- ---------------------------------------------------------------------------
-- shop_orders: unknown region + pending fee + tracking readiness
-- ---------------------------------------------------------------------------
ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_fee_pending BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_region_custom TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS region_configured BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS tracking_number TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS tracking_url TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS internal_shipping_notes TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS carrier_code TEXT;

CREATE INDEX IF NOT EXISTS idx_shop_orders_shipping_fee_pending
  ON shop_orders (shipping_fee_pending)
  WHERE shipping_fee_pending = true;

CREATE INDEX IF NOT EXISTS idx_shop_orders_region_custom
  ON shop_orders (shipping_region_custom)
  WHERE shipping_region_custom IS NOT NULL;

COMMENT ON COLUMN shop_orders.shipping_fee_pending IS
  'True when delivery region was free-text / not in shipping_regions; fee awaits admin review.';
COMMENT ON COLUMN shop_orders.shipping_region_custom IS
  'Exact customer-entered region/city when no configured shipping_regions row matched.';
COMMENT ON COLUMN shop_orders.region_configured IS
  'False when checkout region did not match an active shipping_regions row.';
COMMENT ON COLUMN shop_orders.tracking_number IS
  'Carrier tracking number (future multi-carrier).';
COMMENT ON COLUMN shop_orders.tracking_url IS
  'Optional public tracking link.';
COMMENT ON COLUMN shop_orders.internal_shipping_notes IS
  'Admin-only shipping notes (not shown to customer).';
COMMENT ON COLUMN shop_orders.carrier_code IS
  'Nullable carrier identifier for future multi-carrier support.';
COMMENT ON COLUMN shipping_regions.estimated_days_min IS
  'Lower bound of estimated delivery days.';
COMMENT ON COLUMN shipping_regions.estimated_days_max IS
  'Upper bound of estimated delivery days.';
COMMENT ON COLUMN shipping_regions.estimated_delivery_ar IS
  'Optional Arabic free-text estimated delivery (overrides min/max display when set).';
COMMENT ON COLUMN shipping_regions.meta IS
  'JSONB bag for carriers, campaign prices, free-shipping overrides, etc.';
