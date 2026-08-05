-- APPLY_PRODUCT_COMMERCE_TYPE.sql — Product commerce / primary-action type
-- Same as: supabase/migrations/036_product_commerce_type.sql
-- Prefer APPLY_ALL.sql section 39 on fresh setups. Safe to re-run.
--
-- Storefront CTAs must use product_type only — never category name/slug.
-- Values: ready_to_buy | bridal_accessory | rental_dress | custom_design | service
-- Veils + bridal_robes are always bridal_accessory.
-- Run APPLY_PRODUCT_EXPERIENCE_FOUNDATION (= 037) after this to drop legacy aliases.

ALTER TABLE dresses
  ADD COLUMN IF NOT EXISTS product_type TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dresses_product_type_check'
  ) THEN
    ALTER TABLE dresses
      ADD CONSTRAINT dresses_product_type_check
      CHECK (
        product_type IS NULL
        OR product_type IN (
          'ready_to_buy',
          'bridal_accessory',
          'rental_dress',
          'custom_design',
          'service',
          'accessory',
          'rental'
        )
      );
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

ALTER TABLE dresses
  ALTER COLUMN product_type SET DEFAULT 'ready_to_buy';

UPDATE dresses d
SET product_type = CASE
  WHEN c.legacy_key IN ('rental')
    OR lower(replace(coalesce(c.slug, ''), '-', '_')) IN ('rental', 'rental_dresses', 'rental_dress')
    THEN 'rental_dress'
  WHEN c.legacy_key IN ('custom_design')
    OR lower(replace(coalesce(c.slug, ''), '-', '_')) IN ('custom_design', 'custom')
    THEN 'custom_design'
  WHEN c.product_kind IN ('veil', 'bridal_robe', 'accessories_group')
    OR c.legacy_key IN (
      'bridal_accessories',
      'veils',
      'veil',
      'bridal_robes',
      'bridal_robe',
      'bridal_cape'
    )
    OR lower(replace(coalesce(c.slug, ''), '-', '_')) IN (
      'bridal_accessories',
      'bridal_accessory',
      'veils',
      'veil',
      'bridal_robes',
      'bridal_robe',
      'robes',
      'robe'
    )
    THEN 'bridal_accessory'
  WHEN c.legacy_key IN ('wedding', 'nouf_dresses', 'nouf_dress')
    OR lower(replace(coalesce(c.slug, ''), '-', '_')) IN (
      'wedding',
      'wedding_dresses',
      'nouf_dresses',
      'nouf_dress'
    )
    THEN 'ready_to_buy'
  ELSE NULL
END
FROM categories c
WHERE d.category_id = c.id
  AND (d.product_type IS NULL OR btrim(d.product_type) = '');

UPDATE dresses
SET product_type = CASE
  WHEN lower(replace(btrim(category), '-', '_')) IN ('rental', 'rental_dress', 'rental_dresses')
    THEN 'rental_dress'
  WHEN lower(replace(btrim(category), '-', '_')) IN (
      'custom_design',
      'custom',
      'custom_designs'
    )
    THEN 'custom_design'
  WHEN lower(replace(btrim(category), '-', '_')) IN (
      'bridal_accessories',
      'bridal_accessory',
      'accessories',
      'accessory',
      'veils',
      'veil',
      'bridal_robes',
      'bridal_robe',
      'bridal_cape',
      'robes',
      'robe'
    )
    OR category ILIKE '%accessor%'
    OR category ILIKE '%veil%'
    OR category ILIKE '%robe%'
    OR category ILIKE '%طرحة%'
    OR category ILIKE '%برنص%'
    OR category ILIKE '%اكسسوار%'
    OR category ILIKE '%إكسسوار%'
    THEN 'bridal_accessory'
  WHEN lower(replace(btrim(category), '-', '_')) IN (
      'wedding',
      'wedding_dress',
      'wedding_dresses',
      'nouf_dresses',
      'nouf_dress'
    )
    THEN 'ready_to_buy'
  WHEN price IS NULL AND rental_price IS NOT NULL
    THEN 'rental_dress'
  ELSE 'ready_to_buy'
END
WHERE product_type IS NULL OR btrim(product_type) = '';

UPDATE dresses SET product_type = 'ready_to_buy' WHERE product_type IS NULL;

DO $$
BEGIN
  ALTER TABLE dresses
    ALTER COLUMN product_type SET NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_dresses_product_type ON dresses (product_type);

ALTER TABLE veils
  ADD COLUMN IF NOT EXISTS product_type TEXT;

UPDATE veils
SET product_type = 'bridal_accessory'
WHERE product_type IS NULL
   OR btrim(product_type) = ''
   OR product_type NOT IN ('bridal_accessory', 'accessory');

ALTER TABLE veils
  ALTER COLUMN product_type SET DEFAULT 'bridal_accessory';

DO $$
BEGIN
  ALTER TABLE veils
    ALTER COLUMN product_type SET NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'veils_product_type_check'
  ) THEN
    ALTER TABLE veils
      ADD CONSTRAINT veils_product_type_check
      CHECK (product_type IN ('bridal_accessory', 'accessory'));
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

ALTER TABLE bridal_robes
  ADD COLUMN IF NOT EXISTS product_type TEXT;

UPDATE bridal_robes
SET product_type = 'bridal_accessory'
WHERE product_type IS NULL
   OR btrim(product_type) = ''
   OR product_type NOT IN ('bridal_accessory', 'accessory');

ALTER TABLE bridal_robes
  ALTER COLUMN product_type SET DEFAULT 'bridal_accessory';

DO $$
BEGIN
  ALTER TABLE bridal_robes
    ALTER COLUMN product_type SET NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bridal_robes_product_type_check'
  ) THEN
    ALTER TABLE bridal_robes
      ADD CONSTRAINT bridal_robes_product_type_check
      CHECK (product_type IN ('bridal_accessory', 'accessory'));
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
