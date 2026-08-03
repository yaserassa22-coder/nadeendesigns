-- =============================================================================
-- APPLY_MISSING_MIGRATIONS.sql
-- Targeted, idempotent fix for checkout shipping schema gaps.
--
-- Live probe (2026-08-03) on NadEEN Designs Supabase showed:
--   ✓ shipping_regions exists (M9 seeds present)
--   ✓ shop_orders.delivery_method / shipping_region_id / name_ar /
--     building_number / neighborhood exist
--   ✗ shop_orders M5 address + shipping_cost columns MISSING
--   ✗ shop_orders M10 smart-shipping columns MISSING
--   ✗ shipping_regions estimated_days_min/max / estimated_delivery_ar MISSING
--
-- Run in Supabase → SQL Editor → paste entire file → Run.
-- Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- Prefer this over re-running full APPLY_ALL when only shipping is broken.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- M5 / APPLY_SHOP_SHIPPING — base address + shipping_cost on shop_orders
-- ---------------------------------------------------------------------------
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

-- Code persists fee as shipping_cost (NOT shipping_fee).
ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC NOT NULL DEFAULT 0;

DROP POLICY IF EXISTS "Public read shop_orders by id" ON shop_orders;
CREATE POLICY "Public read shop_orders by id" ON shop_orders
  FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- M9 / APPLY_SHIPPING_REGIONS — ensure table + delivery columns exist
-- (Already present on live DB; kept idempotent for partial environments.)
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
COMMENT ON COLUMN shop_orders.shipping_cost IS
  'Courier fee snapshot at checkout (DB column name is shipping_cost, not shipping_fee).';

-- Seed / upsert regions (idempotent). Safe when rows already exist.
DELETE FROM shipping_regions sr
WHERE sr.id IN (
  'b1000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000002',
  'b1000000-0000-4000-8000-000000000003',
  'b1000000-0000-4000-8000-000000000004',
  'b1000000-0000-4000-8000-000000000005',
  'b1000000-0000-4000-8000-000000000006',
  'b1000000-0000-4000-8000-000000000007',
  'b1000000-0000-4000-8000-000000000008',
  'b1000000-0000-4000-8000-000000000009',
  'b1000000-0000-4000-8000-000000000010',
  'b1000000-0000-4000-8000-000000000011'
)
AND NOT EXISTS (
  SELECT 1 FROM shop_orders o WHERE o.shipping_region_id = sr.id
);

INSERT INTO shipping_regions (id, name_ar, name_en, shipping_fee, is_active, sort_order, meta)
VALUES
  ('c1000000-0000-4000-8000-000000000001', 'الجنوب', 'South', 0, false, 10,
   '{"kind":"group","group_key":"south"}'::jsonb),
  ('c1000000-0000-4000-8000-000000000002', 'المركز', 'Center', 0, false, 20,
   '{"kind":"group","group_key":"center"}'::jsonb),
  ('c1000000-0000-4000-8000-000000000003', 'المثلث', 'Triangle', 0, false, 30,
   '{"kind":"group","group_key":"triangle"}'::jsonb),
  ('c1000000-0000-4000-8000-000000000004', 'الشمال', 'North', 0, false, 40,
   '{"kind":"group","group_key":"north"}'::jsonb),

  ('c2000000-0000-4000-8000-000000000001', 'رهط', 'Rahat', 45, true, 100,
   '{"kind":"city","group_key":"south","group_ar":"الجنوب"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000002', 'تل السبع', 'Tel Sheva', 45, true, 110,
   '{"kind":"city","group_key":"south","group_ar":"الجنوب"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000003', 'حورة', 'Hura', 45, true, 120,
   '{"kind":"city","group_key":"south","group_ar":"الجنوب"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000004', 'اللقية', 'Lakiya', 45, true, 130,
   '{"kind":"city","group_key":"south","group_ar":"الجنوب"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000005', 'شقيب السلام', 'Segev Shalom', 45, true, 140,
   '{"kind":"city","group_key":"south","group_ar":"الجنوب"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000006', 'كسيفة', 'Kuseife', 45, true, 150,
   '{"kind":"city","group_key":"south","group_ar":"الجنوب"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000007', 'عرعرة النقب', 'Arara BaNegev', 45, true, 160,
   '{"kind":"city","group_key":"south","group_ar":"الجنوب"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000008', 'بئر السبع', 'Beer Sheva', 45, true, 170,
   '{"kind":"city","group_key":"south","group_ar":"الجنوب"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000009', 'وادي النعم', 'Wadi al-Naam', 45, true, 180,
   '{"kind":"city","group_key":"south","group_ar":"الجنوب"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000010', 'أبو تلول', 'Abu Tulul', 45, true, 190,
   '{"kind":"city","group_key":"south","group_ar":"الجنوب"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000011', 'ترابين', 'Tarabin', 45, true, 200,
   '{"kind":"city","group_key":"south","group_ar":"الجنوب"}'::jsonb),

  ('c3000000-0000-4000-8000-000000000001', 'تل أبيب', 'Tel Aviv', 40, true, 300,
   '{"kind":"city","group_key":"center","group_ar":"المركز"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000002', 'يافا', 'Jaffa', 40, true, 310,
   '{"kind":"city","group_key":"center","group_ar":"المركز"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000003', 'اللد', 'Lod', 40, true, 320,
   '{"kind":"city","group_key":"center","group_ar":"المركز"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000004', 'الرملة', 'Ramla', 40, true, 330,
   '{"kind":"city","group_key":"center","group_ar":"المركز"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000005', 'نتانيا', 'Netanya', 40, true, 340,
   '{"kind":"city","group_key":"center","group_ar":"المركز"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000006', 'هرتسليا', 'Herzliya', 40, true, 350,
   '{"kind":"city","group_key":"center","group_ar":"المركز"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000007', 'ريشون لتسيون', 'Rishon LeZion', 40, true, 360,
   '{"kind":"city","group_key":"center","group_ar":"المركز"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000008', 'حولون', 'Holon', 40, true, 370,
   '{"kind":"city","group_key":"center","group_ar":"المركز"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000009', 'بات يام', 'Bat Yam', 40, true, 380,
   '{"kind":"city","group_key":"center","group_ar":"المركز"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000010', 'رمات غان', 'Ramat Gan', 40, true, 390,
   '{"kind":"city","group_key":"center","group_ar":"المركز"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000011', 'بيتح تكفا', 'Petah Tikva', 40, true, 400,
   '{"kind":"city","group_key":"center","group_ar":"المركز"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000012', 'كفار سابا', 'Kfar Saba', 40, true, 410,
   '{"kind":"city","group_key":"center","group_ar":"المركز"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000013', 'رענانا', 'Ra''anana', 40, true, 420,
   '{"kind":"city","group_key":"center","group_ar":"المركز"}'::jsonb),

  ('c4000000-0000-4000-8000-000000000001', 'أم الفحم', 'Umm al-Fahm', 40, true, 500,
   '{"kind":"city","group_key":"triangle","group_ar":"المثلث"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000002', 'الطيبة', 'Tayibe', 40, true, 510,
   '{"kind":"city","group_key":"triangle","group_ar":"المثلث"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000003', 'الطيرة', 'Tira', 40, true, 520,
   '{"kind":"city","group_key":"triangle","group_ar":"المثلث"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000004', 'باقة الغربية', 'Baqa al-Gharbiyye', 40, true, 530,
   '{"kind":"city","group_key":"triangle","group_ar":"المثلث"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000005', 'كفر قاسم', 'Kafr Qasim', 40, true, 540,
   '{"kind":"city","group_key":"triangle","group_ar":"المثلث"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000006', 'كفر قرع', 'Kafr Qara', 40, true, 550,
   '{"kind":"city","group_key":"triangle","group_ar":"المثلث"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000007', 'جلجولية', 'Jaljulia', 40, true, 560,
   '{"kind":"city","group_key":"triangle","group_ar":"المثلث"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000008', 'قلنسوة', 'Qalansawe', 40, true, 570,
   '{"kind":"city","group_key":"triangle","group_ar":"المثلث"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000009', 'زيمر', 'Zemer', 40, true, 580,
   '{"kind":"city","group_key":"triangle","group_ar":"المثلث"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000010', 'عارة', 'Ara', 40, true, 590,
   '{"kind":"city","group_key":"triangle","group_ar":"المثلث"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000011', 'عرعرة', 'Arara', 40, true, 600,
   '{"kind":"city","group_key":"triangle","group_ar":"المثلث"}'::jsonb),

  ('c5000000-0000-4000-8000-000000000001', 'الناصرة', 'Nazareth', 45, true, 700,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000002', 'شفاعمرو', 'Shefa-Amr', 45, true, 710,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000003', 'سخنين', 'Sakhnin', 45, true, 720,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000004', 'عكا', 'Acre', 45, true, 730,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000005', 'طبريا', 'Tiberias', 45, true, 740,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000006', 'صفد', 'Safed', 45, true, 750,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000007', 'حيفا', 'Haifa', 45, true, 760,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000008', 'طمرة', 'Tamra', 45, true, 770,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000009', 'مجد الكروم', 'Majd al-Krum', 45, true, 780,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000010', 'كفر كنا', 'Kafr Kanna', 45, true, 790,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000011', 'عيلبون', 'Eilabun', 45, true, 800,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000012', 'دير حنا', 'Deir Hanna', 45, true, 810,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000013', 'عرابة', 'Arraba', 45, true, 820,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000014', 'نحف', 'Nahf', 45, true, 830,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  shipping_fee = EXCLUDED.shipping_fee,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  meta = EXCLUDED.meta,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- M10 / APPLY_SMART_SHIPPING — pending fee, custom region, tracking
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

-- Reload PostgREST schema cache so new columns are visible immediately.
NOTIFY pgrst, 'reload schema';
