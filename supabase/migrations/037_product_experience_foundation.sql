-- 037_product_experience_foundation.sql
-- Sprint 2 Phase 1: align product_type enums + order options / extra services config.
-- Safe to re-run. Preserves existing product and settings data.
--
-- product_type canonical values:
--   ready_to_buy | bridal_accessory | rental_dress | custom_design | service
-- Legacy aliases accessory → bridal_accessory, rental → rental_dress.

-- ---------------------------------------------------------------------------
-- 1) Normalize legacy product_type values
-- ---------------------------------------------------------------------------
UPDATE dresses SET product_type = 'bridal_accessory' WHERE product_type = 'accessory';
UPDATE dresses SET product_type = 'rental_dress' WHERE product_type = 'rental';

UPDATE veils SET product_type = 'bridal_accessory'
WHERE product_type IS NULL OR btrim(product_type) = '' OR product_type = 'accessory';

UPDATE bridal_robes SET product_type = 'bridal_accessory'
WHERE product_type IS NULL OR btrim(product_type) = '' OR product_type = 'accessory';

-- ---------------------------------------------------------------------------
-- 2) Rebuild CHECK constraints with Sprint 2 enums only
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE dresses DROP CONSTRAINT IF EXISTS dresses_product_type_check;
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE dresses
    ADD CONSTRAINT dresses_product_type_check
    CHECK (
      product_type IN (
        'ready_to_buy',
        'bridal_accessory',
        'rental_dress',
        'custom_design',
        'service'
      )
    );
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE veils DROP CONSTRAINT IF EXISTS veils_product_type_check;
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE veils
    ADD CONSTRAINT veils_product_type_check
    CHECK (product_type = 'bridal_accessory');
EXCEPTION
  WHEN others THEN NULL;
END $$;

ALTER TABLE veils
  ALTER COLUMN product_type SET DEFAULT 'bridal_accessory';

DO $$
BEGIN
  ALTER TABLE bridal_robes DROP CONSTRAINT IF EXISTS bridal_robes_product_type_check;
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE bridal_robes
    ADD CONSTRAINT bridal_robes_product_type_check
    CHECK (product_type = 'bridal_accessory');
EXCEPTION
  WHEN others THEN NULL;
END $$;

ALTER TABLE bridal_robes
  ALTER COLUMN product_type SET DEFAULT 'bridal_accessory';

-- ---------------------------------------------------------------------------
-- 3) Per-product order options / extra services overrides (config only)
-- NULL = inherit store defaults. Checkout wiring is Phase 2.
-- ---------------------------------------------------------------------------
ALTER TABLE dresses
  ADD COLUMN IF NOT EXISTS order_options_config JSONB;

ALTER TABLE dresses
  ADD COLUMN IF NOT EXISTS extra_services_config JSONB;

ALTER TABLE veils
  ADD COLUMN IF NOT EXISTS order_options_config JSONB;

ALTER TABLE veils
  ADD COLUMN IF NOT EXISTS extra_services_config JSONB;

ALTER TABLE bridal_robes
  ADD COLUMN IF NOT EXISTS order_options_config JSONB;

ALTER TABLE bridal_robes
  ADD COLUMN IF NOT EXISTS extra_services_config JSONB;

-- ---------------------------------------------------------------------------
-- 4) Ensure store settings row exists (order_options / extra_services live in JSON)
-- App normalize merges defaults; this only ensures the key exists.
-- ---------------------------------------------------------------------------
INSERT INTO settings (key, value, updated_at)
VALUES (
  'store',
  '{}'::jsonb,
  NOW()
)
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
