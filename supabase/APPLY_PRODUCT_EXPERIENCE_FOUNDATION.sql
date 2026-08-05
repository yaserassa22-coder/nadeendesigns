-- APPLY_PRODUCT_EXPERIENCE_FOUNDATION.sql
-- Same as: supabase/migrations/037_product_experience_foundation.sql
-- Prefer APPLY_ALL.sql section 40. Safe to re-run.
--
-- CRITICAL ORDER: DROP CHECK → normalize data → ADD CHECK → validate
-- Never UPDATE to bridal_accessory / rental_dress while old CHECK still rejects them.

-- 1) Drop old CHECK constraints
ALTER TABLE dresses DROP CONSTRAINT IF EXISTS dresses_product_type_check;
ALTER TABLE veils DROP CONSTRAINT IF EXISTS veils_product_type_check;
ALTER TABLE bridal_robes DROP CONSTRAINT IF EXISTS bridal_robes_product_type_check;

-- 2) Normalize existing data
UPDATE dresses
SET product_type = 'bridal_accessory'
WHERE product_type = 'accessory';

UPDATE dresses
SET product_type = 'rental_dress'
WHERE product_type = 'rental';

UPDATE dresses
SET product_type = 'custom_design'
WHERE product_type = 'custom';

UPDATE dresses
SET product_type = 'ready_to_buy'
WHERE product_type IS NULL OR btrim(product_type) = '';

UPDATE veils SET product_type = 'bridal_accessory';
UPDATE bridal_robes SET product_type = 'bridal_accessory';

-- 3) Create NEW CHECK constraints (idempotent)
ALTER TABLE dresses DROP CONSTRAINT IF EXISTS dresses_product_type_check;
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

ALTER TABLE veils DROP CONSTRAINT IF EXISTS veils_product_type_check;
ALTER TABLE veils
  ADD CONSTRAINT veils_product_type_check
  CHECK (product_type = 'bridal_accessory');

ALTER TABLE bridal_robes DROP CONSTRAINT IF EXISTS bridal_robes_product_type_check;
ALTER TABLE bridal_robes
  ADD CONSTRAINT bridal_robes_product_type_check
  CHECK (product_type = 'bridal_accessory');

ALTER TABLE veils
  ALTER COLUMN product_type SET DEFAULT 'bridal_accessory';

ALTER TABLE bridal_robes
  ALTER COLUMN product_type SET DEFAULT 'bridal_accessory';

-- 4) Validate
DO $$
DECLARE
  bad_dresses INT;
  bad_veils INT;
  bad_robes INT;
BEGIN
  SELECT COUNT(*) INTO bad_dresses
  FROM dresses
  WHERE product_type IS NULL
     OR product_type NOT IN (
       'ready_to_buy',
       'bridal_accessory',
       'rental_dress',
       'custom_design',
       'service'
     );

  SELECT COUNT(*) INTO bad_veils
  FROM veils
  WHERE product_type IS DISTINCT FROM 'bridal_accessory';

  SELECT COUNT(*) INTO bad_robes
  FROM bridal_robes
  WHERE product_type IS DISTINCT FROM 'bridal_accessory';

  IF bad_dresses > 0 OR bad_veils > 0 OR bad_robes > 0 THEN
    RAISE EXCEPTION
      '037 product_type validation failed: dresses=% veils=% bridal_robes=%',
      bad_dresses, bad_veils, bad_robes;
  END IF;
END $$;

-- 5) Config columns
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

INSERT INTO settings (key, value, updated_at)
VALUES (
  'store',
  '{}'::jsonb,
  NOW()
)
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
