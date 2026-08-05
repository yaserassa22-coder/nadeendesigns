-- APPLY_PRODUCT_MANAGEMENT_CORE.sql — Sprint P1.1 Product Management Core
-- Same as: supabase/migrations/035_product_management_core.sql
-- Prefer APPLY_ALL.sql section 38 on fresh setups. Safe to re-run.
--
-- Additive columns on dresses only. Storefront keeps using name_ar / price /
-- is_available / images / category_id. Admin dual-writes status ↔ is_available.

ALTER TABLE dresses
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS sale_price NUMERIC,
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS collection_id UUID;

UPDATE dresses
SET status = CASE
  WHEN COALESCE(is_available, true) THEN 'published'
  ELSE 'hidden'
END
WHERE status IS NULL OR btrim(status) = '';

ALTER TABLE dresses
  ALTER COLUMN status SET DEFAULT 'published';

UPDATE dresses SET status = 'published' WHERE status IS NULL;

DO $$
BEGIN
  ALTER TABLE dresses
    ALTER COLUMN status SET NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dresses_status_check'
  ) THEN
    ALTER TABLE dresses
      ADD CONSTRAINT dresses_status_check
      CHECK (status IN ('published', 'draft', 'hidden'));
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dresses_collection_id_fkey'
  ) THEN
    ALTER TABLE dresses
      ADD CONSTRAINT dresses_collection_id_fkey
      FOREIGN KEY (collection_id) REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dresses_slug_unique
  ON dresses (slug)
  WHERE slug IS NOT NULL AND btrim(slug) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_dresses_sku_unique
  ON dresses (sku)
  WHERE sku IS NOT NULL AND btrim(sku) <> '';

CREATE INDEX IF NOT EXISTS idx_dresses_status ON dresses (status);
CREATE INDEX IF NOT EXISTS idx_dresses_collection_id ON dresses (collection_id);
CREATE INDEX IF NOT EXISTS idx_dresses_tags ON dresses USING GIN (tags);

ALTER TABLE dresses
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

NOTIFY pgrst, 'reload schema';
