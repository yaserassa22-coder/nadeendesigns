-- Migration 027 — Product category_id FK + category product_kind / SEO
-- Idempotent. Prefer dresses.category_id over TEXT category for new writes.
-- Keep dresses.category TEXT for read compatibility during transition.

-- ── categories: product_kind + light SEO ─────────────────────────────────────
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS product_kind TEXT;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS seo_title_ar TEXT;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS seo_description_ar TEXT;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS seo_og_image_url TEXT;

-- Drop & recreate CHECK so re-runs stay idempotent
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_product_kind_check;
ALTER TABLE categories
  ADD CONSTRAINT categories_product_kind_check
  CHECK (
    product_kind IS NULL
    OR product_kind IN (
      'dress',
      'veil',
      'bridal_robe',
      'accessories_group'
    )
  );

-- Backfill product_kind from legacy_key (seeded rows)
UPDATE categories
SET product_kind = CASE legacy_key
  WHEN 'wedding' THEN 'dress'
  WHEN 'rental' THEN 'dress'
  WHEN 'custom_design' THEN 'dress'
  WHEN 'nouf_dresses' THEN 'dress'
  WHEN 'veils' THEN 'veil'
  WHEN 'bridal_robes' THEN 'bridal_robe'
  WHEN 'bridal_accessories' THEN 'accessories_group'
  ELSE product_kind
END
WHERE legacy_key IS NOT NULL
  AND (product_kind IS NULL OR product_kind = '');

-- Admin-created categories without legacy_key: default to dress
UPDATE categories
SET product_kind = 'dress'
WHERE product_kind IS NULL
  AND (legacy_key IS NULL OR legacy_key = '')
  AND parent_id IS NULL;

-- Children of accessories group without kind stay null until set; leave alone

CREATE INDEX IF NOT EXISTS idx_categories_product_kind
  ON categories(product_kind)
  WHERE product_kind IS NOT NULL;

-- ── dresses.category_id ──────────────────────────────────────────────────────
ALTER TABLE dresses
  ADD COLUMN IF NOT EXISTS category_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dresses_category_id_fkey'
  ) THEN
    ALTER TABLE dresses
      ADD CONSTRAINT dresses_category_id_fkey
      FOREIGN KEY (category_id)
      REFERENCES categories(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_dresses_category_id ON dresses(category_id);

-- Backfill category_id from TEXT category ↔ categories.legacy_key / slug / aliases
UPDATE dresses d
SET category_id = c.id
FROM categories c
WHERE d.category_id IS NULL
  AND d.category IS NOT NULL
  AND (
    c.legacy_key = d.category
    OR c.slug = d.category
    OR (d.category = 'wedding_dress' AND c.legacy_key = 'wedding')
    OR (d.category = 'nouf_dress' AND c.legacy_key = 'nouf_dresses')
    OR c.slug = REPLACE(d.category, '_', '-')
  );

-- Sync TEXT category from category_id when TEXT empty but FK set (safety)
UPDATE dresses d
SET category = COALESCE(c.legacy_key, c.slug)
FROM categories c
WHERE d.category_id = c.id
  AND (d.category IS NULL OR btrim(d.category) = '');

NOTIFY pgrst, 'reload schema';
